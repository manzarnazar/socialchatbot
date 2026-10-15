import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Clean path to remove locale prefix (e.g. /en/settings -> /settings)
  let pathWithoutLocale = pathname;
  const locales = routing.locales;
  const localeMatch = pathname.match(/^\/([a-z]{2})(?:\/|$)/);
  let currentLocale: string = routing.defaultLocale;
  
  if (localeMatch && (locales as readonly string[]).includes(localeMatch[1])) {
    currentLocale = localeMatch[1];
    pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, '');
    if (pathWithoutLocale === '') {
      pathWithoutLocale = '/';
    }
  }

  const createLocalizedUrl = (targetPath: string) => {
    const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
    if (currentLocale && currentLocale !== routing.defaultLocale) {
      return new URL(`/${currentLocale}${cleanPath}`, request.url);
    }
    return new URL(cleanPath, request.url);
  };

  // Check if public logged-in indicator cookie is present
  const hasSession = request.cookies.has('whatsomni_logged_in');
  const hasAdminSession = request.cookies.has('whatsomni_admin_logged_in');

  // Allow verified=1 bypass for email verification redirects
  const isVerifiedRedirect = request.nextUrl.searchParams.get('verified') === '1';

  // Protected panel paths
  const protectedPrefixes = [
    '/onboarding',
    '/dashboard',
    '/inbox',
    '/contacts',
    '/deals',
    '/calendar',
    '/staff',
    '/flows',
    '/chatbot',
    '/agents',
    '/templates',
    '/campaigns',
    '/whatsapp-flows',
    '/social-posts',
    '/quick-replies',
    '/knowledge-base',
    '/channels',
    '/billing',
    '/settings',
    '/help',
    '/ecommerce',
  ];

  const isProtected = protectedPrefixes.some(prefix => pathWithoutLocale.startsWith(prefix));
  const isAdminProtected = pathWithoutLocale.startsWith('/superadmin') && pathWithoutLocale !== '/superadmin/login';

  // If the user has a session, route them to their appropriate workspace status screen
  if (hasSession) {
    const isOnboardingComplete = request.cookies.get('whatsomni_onboarding_completed')?.value === '1';
    const isAuthPage = pathWithoutLocale === '/login' || pathWithoutLocale === '/register';
    const isOnboardingPage = pathWithoutLocale.startsWith('/onboarding');

    // 1. If on auth pages, redirect them to dashboard/onboarding
    if (isAuthPage) {
      if (isOnboardingComplete) {
        return NextResponse.redirect(createLocalizedUrl('/dashboard'));
      } else {
        return NextResponse.redirect(createLocalizedUrl('/onboarding'));
      }
    }

    // 2. If attempting to access onboarding page but already completed, route to dashboard
    if (isOnboardingPage && isOnboardingComplete) {
      return NextResponse.redirect(createLocalizedUrl('/dashboard'));
    }
  }

  const isAdminAuthPage = pathWithoutLocale === '/superadmin/login';
  if (isAdminAuthPage && hasAdminSession) {
    return NextResponse.redirect(createLocalizedUrl('/superadmin/dashboard'));
  }

  if (isProtected && !hasSession && !hasAdminSession && !isVerifiedRedirect) {
    return NextResponse.redirect(createLocalizedUrl('/login'));
  }

  if (isAdminProtected && !hasAdminSession) {
    return NextResponse.redirect(createLocalizedUrl('/superadmin/login'));
  }

  request.headers.set('x-pathname', pathname);
  const response = intlMiddleware(request);
  response.headers.set('x-pathname', pathname);
  return response;
}

export const config = {
  // Match all pathnames except for the ones starting with:
  // - api (API routes)
  // - sanctum ( Sanctum CSRF / session endpoint)
  // - broadcasting ( Laravel Reverb authentication endpoint)
  // - _next (Next.js internal files)
  // - static files with extensions (e.g. logo.svg, favicon.ico)
  matcher: ['/((?!api|sanctum|broadcasting|_next|.*\\..*).*)']
};
