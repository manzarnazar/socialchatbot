import { fetchWithCsrf, getBackendUrl } from './api';

let paddleScriptPromise: Promise<void> | null = null;
let isInitialized = false;
let currentClientToken: string | null = null;

export interface PaddleConfig {
  client_token: string;
  mode: 'sandbox' | 'live' | 'test' | string;
  enabled: boolean;
}

/**
 * Dynamically load the official Paddle.js v2 script.
 */
export function loadPaddleScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if ((window as any).Paddle) {
    return Promise.resolve();
  }

  if (paddleScriptPromise) {
    return paddleScriptPromise;
  }

  paddleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src*="paddle.com/paddle/v2/paddle.js"]');
    if (existing) {
      if ((window as any).Paddle) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', (err) => reject(err));
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => {
      paddleScriptPromise = null;
      reject(err);
    };
    document.body.appendChild(script);
  });

  return paddleScriptPromise;
}

/**
 * Fetch public Paddle configuration from backend.
 */
export async function getPaddlePublicConfig(): Promise<PaddleConfig | null> {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/public/billing/paddle-config`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('[Paddle] Failed to fetch public configuration:', err);
    return null;
  }
}

/**
 * Initialize Paddle.js with public client token and environment settings.
 */
export async function initializePaddle(
  overrideConfig?: PaddleConfig,
  onEventCallback?: (event: any) => void
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  await loadPaddleScript();

  const paddle = (window as any).Paddle;
  if (!paddle) {
    console.error('[Paddle] Paddle SDK not found on window.');
    return false;
  }

  const config = overrideConfig || (await getPaddlePublicConfig());
  if (!config || !config.enabled || !config.client_token) {
    console.warn('[Paddle] Paddle is not enabled or missing client_token.');
    return false;
  }

  if (isInitialized && currentClientToken === config.client_token) {
    return true;
  }

  try {
    const isSandbox =
      config.mode === 'sandbox' ||
      config.mode === 'test' ||
      (typeof config.client_token === 'string' && config.client_token.startsWith('test_'));

    if (isSandbox && paddle.Environment?.set) {
      paddle.Environment.set('sandbox');
    }

    paddle.Initialize({
      token: config.client_token,
      eventCallback: (event: any) => {
        if (onEventCallback) {
          onEventCallback(event);
        }
      },
    });

    isInitialized = true;
    currentClientToken = config.client_token;
    return true;
  } catch (error) {
    console.error('[Paddle] Error during Paddle.Initialize:', error);
    return false;
  }
}

/**
 * Open Paddle Checkout overlay for a specific transaction ID.
 */
export async function openPaddleCheckout(params: {
  transactionId: string;
  planId?: number;
  onSuccess?: (txId: string) => void;
  onClose?: () => void;
  config?: PaddleConfig;
}): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const initialized = await initializePaddle(params.config, async (event) => {
    if (event?.name === 'checkout.completed' || event?.name === 'checkout.payment.succeeded') {
      const txId = event?.data?.transaction_id || event?.data?.id || params.transactionId;
      try {
        await verifyPaddleTransaction(txId, params.planId);
      } catch (e) {
        console.error('[Paddle] Verification error in event callback:', e);
      }
      if (params.onSuccess) {
        params.onSuccess(txId);
      }
    } else if (event?.name === 'checkout.closed') {
      if (params.onClose) {
        params.onClose();
      }
    }
  });

  if (!initialized) {
    return false;
  }

  const paddle = (window as any).Paddle;
  if (paddle?.Checkout?.open) {
    paddle.Checkout.open({
      transactionId: params.transactionId,
      settings: {
        displayMode: 'overlay',
        theme: 'light',
      },
    });
    return true;
  }

  return false;
}

/**
 * Verify Paddle transaction with backend.
 */
export async function verifyPaddleTransaction(transactionId: string, planId?: number) {
  const response = await fetchWithCsrf('/public/billing/paddle/verify', {
    method: 'POST',
    body: JSON.stringify({
      transaction_id: transactionId,
      plan_id: planId,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Paddle transaction verification failed');
  }

  return data;
}
