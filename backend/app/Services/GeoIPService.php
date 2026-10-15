<?php

namespace App\Services;

use App\Models\Currency;
use App\Models\PlatformSetting;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeoIPService
{
    /**
     * ISO 3166-1 alpha-2 Country Code to ISO 4217 Currency Code Mapping.
     */
    protected const COUNTRY_CURRENCY_MAP = [
        // India
        'IN' => 'INR',

        // United States & US Dollar regions
        'US' => 'USD', 'AS' => 'USD', 'EC' => 'USD', 'GU' => 'USD',
        'MH' => 'USD', 'FM' => 'USD', 'MP' => 'USD', 'PW' => 'USD',
        'PR' => 'USD', 'SV' => 'USD', 'TC' => 'USD', 'TL' => 'USD',
        'UM' => 'USD', 'VG' => 'USD', 'VI' => 'USD', 'ZW' => 'USD',

        // United Kingdom
        'GB' => 'GBP', 'GG' => 'GBP', 'IM' => 'GBP', 'JE' => 'GBP',

        // Eurozone Countries
        'AD' => 'EUR', 'AT' => 'EUR', 'BE' => 'EUR', 'CY' => 'EUR',
        'EE' => 'EUR', 'FI' => 'EUR', 'FR' => 'EUR', 'DE' => 'EUR',
        'GR' => 'EUR', 'IE' => 'EUR', 'IT' => 'EUR', 'LV' => 'EUR',
        'LT' => 'EUR', 'LU' => 'EUR', 'MT' => 'EUR', 'MC' => 'EUR',
        'ME' => 'EUR', 'NL' => 'EUR', 'PT' => 'EUR', 'SM' => 'EUR',
        'SK' => 'EUR', 'SI' => 'EUR', 'ES' => 'EUR', 'VA' => 'EUR',
        'XK' => 'EUR',

        // Canada
        'CA' => 'CAD',

        // Australia
        'AU' => 'AUD', 'CX' => 'AUD', 'CC' => 'AUD', 'HM' => 'AUD',
        'KI' => 'AUD', 'NR' => 'AUD', 'NF' => 'AUD', 'TV' => 'AUD',

        // Nigeria & Africa
        'NG' => 'NGN',
        'ZA' => 'ZAR',
        'KE' => 'KES',
        'GH' => 'GHS',
        'EG' => 'EGP',

        // Middle East
        'AE' => 'AED',
        'SA' => 'SAR',
        'QA' => 'QAR',
        'KW' => 'KWD',
        'OM' => 'OMR',
        'BH' => 'BHD',
        'IL' => 'ILS',

        // Asia Pacific
        'SG' => 'SGD',
        'MY' => 'MYR',
        'ID' => 'IDR',
        'PH' => 'PHP',
        'VN' => 'VND',
        'TH' => 'THB',
        'JP' => 'JPY',
        'KR' => 'KRW',
        'CN' => 'CNY',
        'HK' => 'HKD',
        'TW' => 'TWD',
        'NZ' => 'NZD',
        'PK' => 'PKR',
        'BD' => 'BDT',
        'LK' => 'LKR',

        // Latin America
        'BR' => 'BRL',
        'MX' => 'MXN',
        'AR' => 'ARS',
        'CO' => 'COP',
        'CL' => 'CLP',
        'PE' => 'PEN',

        // Europe (Non-Euro)
        'CH' => 'CHF', 'LI' => 'CHF',
        'SE' => 'SEK',
        'NO' => 'NOK',
        'DK' => 'DKK',
        'PL' => 'PLN',
        'CZ' => 'CZK',
        'HU' => 'HUF',
        'RO' => 'RON',
        'TR' => 'TRY',
    ];

    /**
     * Detect the client's real public IP address.
     */
    public function getClientIp(Request $request): string
    {
        // 1. Cloudflare Connecting IP header
        $cfIp = $request->header('CF-Connecting-IP');
        if (!empty($cfIp) && filter_var($cfIp, FILTER_VALIDATE_IP)) {
            return trim($cfIp);
        }

        // 2. X-Forwarded-For header (first non-internal IP)
        $forwarded = $request->header('X-Forwarded-For');
        if (!empty($forwarded)) {
            $ips = explode(',', $forwarded);
            foreach ($ips as $ip) {
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
            if (isset($ips[0]) && filter_var(trim($ips[0]), FILTER_VALIDATE_IP)) {
                return trim($ips[0]);
            }
        }

        // 3. X-Real-IP header
        $realIp = $request->header('X-Real-IP');
        if (!empty($realIp) && filter_var($realIp, FILTER_VALIDATE_IP)) {
            return trim($realIp);
        }

        $rawIp = $request->ip() ?: '127.0.0.1';

        // 4. If raw IP is private or loopback, dynamically resolve host's actual public IP
        if (!filter_var($rawIp, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            $publicIp = Cache::remember('geoip_local_outbound_ip', now()->addHours(24), function () {
                try {
                    $res = Http::timeout(3)->acceptJson()->get('http://ip-api.com/json/?fields=status,query');
                    if ($res->successful() && $res->json('status') === 'success' && !empty($res->json('query'))) {
                        return trim($res->json('query'));
                    }
                } catch (\Exception $e) {
                    Log::debug("Outbound public IP discovery failed: " . $e->getMessage());
                }
                return null;
            });

            if ($publicIp) {
                return $publicIp;
            }
        }

        return $rawIp;
    }

    /**
     * Detect ISO 2-letter Country Code from the request.
     */
    public function detectCountry(Request $request): ?string
    {
        // 1. Explicit testing override via query or header (valuable for testing/QA)
        $override = $request->query('country') ?: $request->header('X-Test-Country');
        if (!empty($override) && strlen($override) === 2) {
            return strtoupper($override);
        }

        // 2. Cloudflare Country Header (zero latency, injected by edge)
        $cfCountry = $request->header('CF-IPCountry');
        if (!empty($cfCountry) && strlen($cfCountry) === 2 && $cfCountry !== 'XX' && $cfCountry !== 'T1') {
            return strtoupper($cfCountry);
        }

        // 3. Generic reverse-proxy / CDN country headers
        $proxyCountry = $request->header('X-Country-Code') 
            ?: ($request->header('X-Geo-Country') ?: $request->header('GEOIP_COUNTRY_CODE'));
        if (!empty($proxyCountry) && strlen($proxyCountry) === 2) {
            return strtoupper($proxyCountry);
        }

        // 4. IP-based lookup with caching
        $ip = $this->getClientIp($request);
        return $this->lookupCountryByIp($ip);
    }

    /**
     * Lookup country code from public IP with 24-hour cache.
     * If IP is loopback/private, queries outbound public connection to detect the host machine's physical location.
     */
    protected function lookupCountryByIp(string $ip): ?string
    {
        $isPrivateOrLoopback = !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);

        $cacheKey = $isPrivateOrLoopback ? "geoip_country_local_outbound" : "geoip_country_{$ip}";

        return Cache::remember($cacheKey, now()->addHours(24), function () use ($ip, $isPrivateOrLoopback) {
            // 1. Try ip-api.com (zero auth, fast, precise ISO-2 country code)
            try {
                $endpoint = $isPrivateOrLoopback 
                    ? "http://ip-api.com/json/?fields=status,countryCode" 
                    : "http://ip-api.com/json/{$ip}?fields=status,countryCode";

                $response = Http::timeout(3)->acceptJson()->get($endpoint);
                if ($response->successful() && $response->json('status') === 'success') {
                    $country = $response->json('countryCode');
                    if (!empty($country) && strlen($country) === 2) {
                        return strtoupper($country);
                    }
                }
            } catch (\Exception $e) {
                Log::debug("GeoIP ip-api lookup failed for IP {$ip}: " . $e->getMessage());
            }

            // 2. Fallback to ipwho.is (fast JSON endpoint, high availability)
            try {
                $endpoint = $isPrivateOrLoopback
                    ? "http://ipwho.is/"
                    : "http://ipwho.is/{$ip}";

                $response = Http::timeout(3)->acceptJson()->get($endpoint);
                if ($response->successful() && $response->json('success') === true) {
                    $country = $response->json('country_code');
                    if (!empty($country) && strlen($country) === 2) {
                        return strtoupper($country);
                    }
                }
            } catch (\Exception $e) {
                Log::debug("GeoIP ipwho.is lookup failed for IP {$ip}: " . $e->getMessage());
            }

            // 3. Fallback to ipapi.co
            try {
                $endpoint = $isPrivateOrLoopback
                    ? "https://ipapi.co/json/"
                    : "https://ipapi.co/{$ip}/json/";

                $response = Http::timeout(3)->acceptJson()->get($endpoint);
                if ($response->successful()) {
                    $country = $response->json('country_code');
                    if (!empty($country) && strlen($country) === 2) {
                        return strtoupper($country);
                    }
                }
            } catch (\Exception $e) {
                Log::debug("GeoIP ipapi.co lookup failed for IP {$ip}: " . $e->getMessage());
            }

            return null;
        });
    }

    /**
     * Map a 2-letter ISO country code to an ISO currency code.
     */
    public function mapCountryToCurrency(?string $countryCode): ?string
    {
        if (empty($countryCode)) {
            return null;
        }

        $upper = strtoupper(trim($countryCode));
        return self::COUNTRY_CURRENCY_MAP[$upper] ?? null;
    }

    /**
     * Resolve the active Currency object for a given country code.
     */
    public function getCurrencyForCountry(?string $countryCode): ?Currency
    {
        $currencyCode = $this->mapCountryToCurrency($countryCode);
        if (!$currencyCode) {
            return null;
        }

        return Currency::where('code', $currencyCode)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Resolve the appropriate Currency for an incoming request and optional Tenant context.
     *
     * Hierarchy:
     * 1. Explicit query parameter `?currency=XYZ` or header `X-Currency: XYZ` (if active).
     * 2. Detected location/IP mapped currency (strictly localized to visitor's physical region).
     * 3. Tenant profile saved currency (if tenant context given and active).
     * 4. Platform default / primary currency (`is_default = true`).
     */
    public function resolveCurrency(Request $request, ?Tenant $tenant = null): Currency
    {
        // 1. Explicit currency code requested by frontend (e.g. user toggled currency dropdown)
        $requestedCode = $request->query('currency') ?: $request->header('X-Currency');
        if (!empty($requestedCode)) {
            $currency = Currency::where('code', strtoupper(trim($requestedCode)))
                ->where('is_active', true)
                ->first();
            if ($currency) {
                return $currency;
            }
        }

        // 2. Detected location / IP mapped currency (Dynamic GeoIP lookup)
        $detectedCountry = $this->detectCountry($request);
        if ($detectedCountry) {
            $geoCurrency = $this->getCurrencyForCountry($detectedCountry);
            if ($geoCurrency) {
                return $geoCurrency;
            }
        }

        // 3. Tenant's assigned currency (if set and active)
        if ($tenant && $tenant->currency_id) {
            $tenantCurrency = Currency::where('id', $tenant->currency_id)
                ->where('is_active', true)
                ->first();
            if ($tenantCurrency) {
                return $tenantCurrency;
            }
        }

        // 4. Primary / Default Platform Currency Fallback
        return $this->getPlatformDefaultCurrency();
    }

    /**
     * Get the platform default primary currency.
     */
    public function getPlatformDefaultCurrency(): Currency
    {
        $primary = Currency::where('is_default', true)->first();
        if ($primary && $primary->is_active) {
            return $primary;
        }

        $code = PlatformSetting::where('key', 'default_currency')->first()?->value;
        if ($code) {
            $matched = Currency::where('code', $code)->where('is_active', true)->first();
            if ($matched) {
                return $matched;
            }
        }

        $firstActive = Currency::where('is_active', true)->first();
        if ($firstActive) {
            return $firstActive;
        }

        // Absolute fallback safety creation
        return Currency::firstOrCreate(
            ['code' => 'USD'],
            [
                'name' => 'US Dollar',
                'symbol' => '$',
                'is_active' => true,
                'is_default' => true,
            ]
        );
    }

    /**
     * Get all active currencies ordered by default first, then code.
     */
    public function getActiveCurrencies(): Collection
    {
        return Currency::where('is_active', true)
            ->orderBy('is_default', 'desc')
            ->orderBy('code', 'asc')
            ->get();
    }
}
