<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ClearCookieOnUnauthorized
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($response instanceof Response && $response->getStatusCode() === 401) {
            if (str_contains($request->getPathInfo(), '/auth/me')) {
                $response->headers->setCookie(
                    cookie('whatsomni_logged_in', '', -1, '/', null, false, false)
                );
            }
            if (str_contains($request->getPathInfo(), '/admin/me')) {
                $response->headers->setCookie(
                    cookie('whatsomni_admin_logged_in', '', -1, '/', null, false, false)
                );
            }
        }

        return $response;
    }
}
