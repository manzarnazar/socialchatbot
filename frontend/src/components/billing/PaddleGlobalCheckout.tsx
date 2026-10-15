'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { initializePaddle, verifyPaddleTransaction } from '@/lib/paddle';

export function PaddleGlobalCheckout() {
  const t = useTranslations('Billing');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const processedTxnRef = useRef<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const ptxn = 
      searchParams?.get('_ptxn') || 
      searchParams?.get('paddle_transaction_id') || 
      searchParams?.get('paddle_txn') ||
      searchParams?.get('txn');

    if (!ptxn || processedTxnRef.current === ptxn) {
      return;
    }

    processedTxnRef.current = ptxn;

    let mounted = true;

    async function handlePaddleAutoOpen() {
      try {
        const initialized = await initializePaddle(undefined, async (event) => {
          console.log('[PaddleGlobalCheckout] Received Paddle event:', event);

          if (event?.name === 'checkout.completed' || event?.name === 'checkout.payment.succeeded') {
            const completedTxId = event?.data?.transaction_id || event?.data?.id || ptxn;
            setIsVerifying(true);
            const loadingToast = toast.loading(t('paddleVerifying') || 'Verifying your Paddle subscription...');

            try {
              const res = await verifyPaddleTransaction(completedTxId);
              toast.dismiss(loadingToast);
              toast.success(t('paddleActivated') || 'Subscription activated successfully!', {
                description: res?.message || 'Your workspace plan has been upgraded.',
              });

              // Clean up search params from current URL
              const nextUrl = new URL(window.location.href);
              nextUrl.searchParams.delete('_ptxn');
              nextUrl.searchParams.delete('paddle_transaction_id');
              nextUrl.searchParams.delete('paddle_txn');
              nextUrl.searchParams.delete('txn');
              nextUrl.searchParams.set('checkout', 'success');

              router.replace(nextUrl.pathname + nextUrl.search);
            } catch (err: any) {
              toast.dismiss(loadingToast);
              toast.error(t('paddleFailed') || 'Payment completed, but verification failed.', {
                description: err?.message || 'Please contact support if your plan does not update shortly.',
              });
            } finally {
              setIsVerifying(false);
            }
          } else if (event?.name === 'checkout.closed') {
            console.log('[PaddleGlobalCheckout] Checkout overlay closed by user.');
          }
        });

        if (!initialized || !mounted) {
          return;
        }

        const paddle = (window as any).Paddle;
        if (paddle?.Checkout?.open) {
          paddle.Checkout.open({
            transactionId: ptxn,
            settings: {
              displayMode: 'overlay',
              theme: 'light',
              successUrl: `${window.location.origin}/settings/billing?checkout=success`,
            },
          });
        }
      } catch (err) {
        console.error('[PaddleGlobalCheckout] Failed to trigger Paddle checkout overlay:', err);
      }
    }

    handlePaddleAutoOpen();

    return () => {
      mounted = false;
    };
  }, [searchParams, router, pathname]);

  return null;
}
