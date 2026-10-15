/**
 * Return the raw backend base URL for direct resources.
 */
export function getBackendUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://127.0.0.1:8000';
}

/**
 * Helper to retrieve the XSRF-TOKEN cookie set by Laravel.
 */
function getXsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'));
  if (match) {
    return decodeURIComponent(match[2]);
  }
  return '';
}

/**
 * Perform a fetch request to the Laravel backend, automatically
 * negotiating CSRF cookie initialization and header mapping for state-modifying requests.
 */
export async function fetchWithCsrf(path: string, options: RequestInit = {}) {
  const method = options.method?.toUpperCase() || 'GET';
  const backendBase = getBackendUrl();

  // State-modifying requests require CSRF cookie initialization
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    await fetch(`${backendBase}/sanctum/csrf-cookie`, {
      method: 'GET',
      credentials: 'include',
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  // Extract the cookie set by Laravel and append it manually as the X-XSRF-TOKEN header
  const xsrfToken = getXsrfToken();
  if (xsrfToken) {
    headers['X-XSRF-TOKEN'] = xsrfToken;
  }

  // Include Bearer Token if saved locally to support token-based authentication fallback
  if (typeof window !== 'undefined') {
    const isAdminPath = path.startsWith('/admin') && !path.startsWith('/admin/login');
    const token = isAdminPath 
      ? localStorage.getItem('whatsomni_admin_token')
      : localStorage.getItem('whatsomni_token');

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!isAdminPath) {
      const workspaceId = localStorage.getItem('whatsomni_workspace_id');
      if (workspaceId) {
        headers['X-Workspace-ID'] = workspaceId;
      }
    }

    const localeMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
    if (localeMatch && localeMatch[1]) {
      headers['Accept-Language'] = localeMatch[1];
    }
  }

  const response = await fetch(`${backendBase}/api${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const getCookieDomains = () => {
    if (typeof window === 'undefined') return [''];
    const host = window.location.hostname;
    return Array.from(new Set(['', `; domain=${host}`, `; domain=.${host}`]));
  };

  if (path === '/auth/logout') {
    clearAuthSession('tenant');
  }

  if (path === '/admin/logout') {
    clearAuthSession('admin');
  }

  if (response.ok && path === '/auth/login' && typeof document !== 'undefined') {
    getCookieDomains().forEach(d => {
      document.cookie = `whatsomni_logged_in=1; path=/; max-age=31536000; SameSite=Lax${d}`;
    });
    try {
      const clone = response.clone();
      clone.json().then(data => {
        if (data.token) {
          localStorage.setItem('whatsomni_token', data.token);
        }
        const tenant = data.user?.tenant;
        if (tenant) {
          const onboardingComplete = (tenant.onboarding_step === 'complete' || tenant.onboarding_step === '3') ? '1' : '0';
          const planSelected = tenant.plan_id ? '1' : '0';
          getCookieDomains().forEach(d => {
            document.cookie = `whatsomni_onboarding_completed=${onboardingComplete}; path=/; max-age=31536000; SameSite=Lax${d}`;
            document.cookie = `whatsomni_plan_selected=${planSelected}; path=/; max-age=31536000; SameSite=Lax${d}`;
          });
        }
      }).catch(() => {});
    } catch (e) {
      console.error('Failed to sync login cookies:', e);
    }
  }

  if (response.ok && path === '/admin/login' && typeof document !== 'undefined') {
    getCookieDomains().forEach(d => {
      document.cookie = `whatsomni_admin_logged_in=1; path=/; max-age=31536000; SameSite=Lax${d}`;
    });
    try {
      const clone = response.clone();
      clone.json().then(data => {
        if (data.token) {
          localStorage.setItem('whatsomni_admin_token', data.token);
        }
      }).catch(() => {});
    } catch {}
  }

  // Impersonation Start: Synchronize cookies so Next.js middleware and tenant panel allow access
  if (response.ok && path.includes('/impersonate') && !path.includes('/stop') && typeof document !== 'undefined') {
    getCookieDomains().forEach(d => {
      document.cookie = `whatsomni_logged_in=1; path=/; max-age=31536000; SameSite=Lax${d}`;
      document.cookie = `whatsomni_onboarding_completed=1; path=/; max-age=31536000; SameSite=Lax${d}`;
      document.cookie = `whatsomni_plan_selected=1; path=/; max-age=31536000; SameSite=Lax${d}`;
    });
    try {
      const clone = response.clone();
      clone.json().then(data => {
        if (data.token) {
          localStorage.setItem('whatsomni_token', data.token);
        }
        const tenantId = data.user?.tenant_id || data.tenant?.id;
        if (tenantId) {
          localStorage.setItem('whatsomni_workspace_id', String(tenantId));
          getCookieDomains().forEach(d => {
            document.cookie = `whatsomni_workspace_id=${tenantId}; path=/; max-age=31536000; SameSite=Lax${d}`;
          });
        }
      }).catch(() => {});
    } catch {}
  }

  // Impersonation Stop: Clean up tenant cookies and return cleanly to admin session
  if (response.ok && path.includes('/impersonate/stop') && typeof document !== 'undefined') {
    getCookieDomains().forEach(d => {
      document.cookie = `whatsomni_logged_in=; path=/; max-age=0; SameSite=Lax${d}`;
      document.cookie = `whatsomni_onboarding_completed=; path=/; max-age=0; SameSite=Lax${d}`;
      document.cookie = `whatsomni_plan_selected=; path=/; max-age=0; SameSite=Lax${d}`;
      document.cookie = `whatsomni_workspace_id=; path=/; max-age=0; SameSite=Lax${d}`;
      document.cookie = `whatsomni_admin_logged_in=1; path=/; max-age=31536000; SameSite=Lax${d}`;
    });
    try {
      const clone = response.clone();
      clone.json().then(data => {
        if (data.token) {
          localStorage.setItem('whatsomni_admin_token', data.token);
          localStorage.setItem('whatsomni_token', data.token);
        }
      }).catch(() => {});
    } catch {}
  }

  if ((response.status === 401 || response.status === 403) && typeof document !== 'undefined') {
    if (response.status === 401 && (path.includes('/auth/me') || path === '/auth/logout')) {
      clearAuthSession('tenant');
    }
    if ((response.status === 401 || response.status === 403) && (path.includes('/admin/me') || path === '/admin/logout')) {
      clearAuthSession('admin');
    }
  }

  if (response.ok && path.includes('/auth/me') && typeof document !== 'undefined') {
    try {
      const clone = response.clone();
      clone.json().then(data => {
        getCookieDomains().forEach(d => {
          document.cookie = `whatsomni_logged_in=1; path=/; max-age=31536000; SameSite=Lax${d}`;
        });
        const tenant = data.user?.tenant;
        if (tenant) {
          const onboardingComplete = (tenant.onboarding_step === 'complete' || tenant.onboarding_step === '3') ? '1' : '0';
          const planSelected = tenant.plan_id ? '1' : '0';
          getCookieDomains().forEach(d => {
            document.cookie = `whatsomni_onboarding_completed=${onboardingComplete}; path=/; max-age=31536000; SameSite=Lax${d}`;
            document.cookie = `whatsomni_plan_selected=${planSelected}; path=/; max-age=31536000; SameSite=Lax${d}`;
          });
        }
      }).catch(() => {});
    } catch (e) {
      console.error('Failed to sync onboarding cookies:', e);
    }
  }

  return response;
}

/**
 * Helper to wipe all local storage auth keys and expire session cookies on client.
 */
export function clearAuthSession(type: 'tenant' | 'admin' | 'all' = 'all') {
  if (typeof window === 'undefined') return;

  if (type === 'tenant' || type === 'all') {
    localStorage.removeItem('whatsomni_token');
    localStorage.removeItem('whatsomni_workspace_id');
  }

  if (type === 'admin' || type === 'all') {
    localStorage.removeItem('whatsomni_admin_token');
  }

  const host = window.location.hostname;
  const domains = Array.from(new Set(['', `; domain=${host}`, `; domain=.${host}`]));

  const tenantCookies = [
    'whatsomni_logged_in',
    'whatsomni_onboarding_completed',
    'whatsomni_plan_selected',
    'whatsomni_session',
    'whatsomni_remember',
  ];

  const adminCookies = [
    'whatsomni_admin_logged_in',
  ];

  const cookiesToClear: string[] = [];
  if (type === 'tenant' || type === 'all') cookiesToClear.push(...tenantCookies);
  if (type === 'admin' || type === 'all') cookiesToClear.push(...adminCookies);

  domains.forEach(d => {
    cookiesToClear.forEach(cookieName => {
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${d}; Max-Age=0;`;
    });
  });
}
