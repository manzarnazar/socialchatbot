import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

const tenantLoaders: Record<string, () => Promise<{ default: Record<string, any> }>> = {
  en: () => import('./locales/tenant/en.json'),
  hi: () => import('./locales/tenant/hi.json'),
  es: () => import('./locales/tenant/es.json'),
  ar: () => import('./locales/tenant/ar.json'),
  fr: () => import('./locales/tenant/fr.json'),
  he: () => import('./locales/tenant/he.json'),
  id: () => import('./locales/tenant/id.json'),
  it: () => import('./locales/tenant/it.json'),
  pt: () => import('./locales/tenant/pt.json'),
  vi: () => import('./locales/tenant/vi.json'),
};

const superadminLoaders: Record<string, () => Promise<{ default: Record<string, any> }>> = {
  en: () => import('./locales/superadmin/en.json'),
  hi: () => import('./locales/superadmin/hi.json'),
  es: () => import('./locales/superadmin/es.json'),
  ar: () => import('./locales/superadmin/ar.json'),
  fr: () => import('./locales/superadmin/fr.json'),
  he: () => import('./locales/superadmin/he.json'),
  id: () => import('./locales/superadmin/id.json'),
  it: () => import('./locales/superadmin/it.json'),
  pt: () => import('./locales/superadmin/pt.json'),
  vi: () => import('./locales/superadmin/vi.json'),
};

import { headers } from 'next/headers';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  let isSuperAdmin = false;
  try {
    const headerList = await headers();
    const pathname = headerList.get('x-pathname') || headerList.get('x-invoke-path') || headerList.get('referer') || '';
    isSuperAdmin = pathname.includes('/superadmin');
  } catch {
    // Fallback during static build passes
  }

  const tenantLoader = tenantLoaders[locale] || tenantLoaders.en;
  
  if (isSuperAdmin) {
    const superadminLoader = superadminLoaders[locale] || superadminLoaders.en;
    const [tenantModule, superadminModule] = await Promise.all([
      tenantLoader(),
      superadminLoader(),
    ]);

    return {
      locale,
      messages: {
        ...tenantModule.default,
        Superadmin: superadminModule.default,
        SuperAdmin: superadminModule.default,
        superadmin: superadminModule.default,
      }
    };
  }

  const tenantModule = await tenantLoader();
  return {
    locale,
    messages: tenantModule.default,
  };
});
