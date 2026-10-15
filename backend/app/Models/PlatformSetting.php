<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Crypt;

class PlatformSetting extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'key',
        'value',
    ];

    protected $casts = [
        // We handle JSON encoding/decoding manually in accessors to perform encryption
    ];

    /**
     * Clear the public settings cache across all stores.
     */
    public static function clearPublicCache(): void
    {
        try {
            \Illuminate\Support\Facades\Cache::forget('platform_public_settings_cache');
        } catch (\Throwable $e) {
            // Silently ignore cache error
        }
    }

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::saved(function () {
            static::clearPublicCache();
        });

        static::updated(function () {
            static::clearPublicCache();
        });

        static::created(function () {
            static::clearPublicCache();
        });

        static::deleted(function () {
            static::clearPublicCache();
        });

        static::restored(function () {
            static::clearPublicCache();
        });
    }

    /**
     * List of sensitive keys that should always be encrypted using AES-256.
     */
    protected static array $sensitiveKeys = [
        'secret_key',
        'webhook_secret',
        'key_secret',
        'client_secret',
        'app_secret',
        'api_key',
        'access_token',
        'refresh_token',
        'auth_token',
        'secret_token',
        'api_secret',
        'auth_key',
        'password',
        'token',
    ];

    /**
     * Check if a field or setting key should be considered sensitive.
     */
    public static function isSensitiveKey(string $key): bool
    {
        $normalized = strtolower(trim($key));
        if (in_array($normalized, self::$sensitiveKeys, true)) {
            return true;
        }

        foreach (self::$sensitiveKeys as $sensitive) {
            if (str_ends_with($normalized, '_' . $sensitive)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Recursively decrypt sensitive values using AES-256.
     */
    public static function decryptRecursive(mixed $data): mixed
    {
        if (is_array($data)) {
            foreach ($data as $k => $v) {
                if (is_array($v)) {
                    $data[$k] = self::decryptRecursive($v);
                } elseif (is_string($v) && !empty($v) && self::isSensitiveKey((string) $k)) {
                    try {
                        $data[$k] = Crypt::decryptString($v);
                    } catch (\Throwable $e) {
                        // Fall back if already plaintext
                        $data[$k] = $v;
                    }
                }
            }
            return $data;
        }

        if (is_string($data) && !empty($data)) {
            try {
                return Crypt::decryptString($data);
            } catch (\Throwable $e) {
                return $data;
            }
        }

        return $data;
    }

    /**
     * Recursively encrypt sensitive values using AES-256.
     */
    public static function encryptRecursive(mixed $data): mixed
    {
        if (is_array($data)) {
            foreach ($data as $k => $v) {
                if (is_array($v)) {
                    $data[$k] = self::encryptRecursive($v);
                } elseif (is_string($v) && !empty($v) && self::isSensitiveKey((string) $k)) {
                    try {
                        // Verify if already encrypted to avoid double encryption
                        Crypt::decryptString($v);
                        $data[$k] = $v;
                    } catch (\Throwable $e) {
                        try {
                            $data[$k] = Crypt::encryptString($v);
                        } catch (\Throwable $err) {
                            $data[$k] = $v;
                        }
                    }
                }
            }
            return $data;
        }

        if (is_string($data) && !empty($data)) {
            try {
                Crypt::decryptString($data);
                return $data;
            } catch (\Throwable $e) {
                try {
                    return Crypt::encryptString($data);
                } catch (\Throwable $err) {
                    return $data;
                }
            }
        }

        return $data;
    }

    /**
     * Retrieve a setting value by key, with an optional default.
     */
    public static function getSetting(string $key, $default = null)
    {
        try {
            $setting = static::where('key', $key)->first();
            if ($setting && $setting->value !== null) {
                return $setting->value;
            }
        } catch (\Throwable $e) {
            // Silently fallback on query error
        }
        return $default;
    }

    /**
     * Set or update a setting value by key.
     */
    public static function setSetting(string $key, mixed $value): static
    {
        $setting = static::updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );
        static::clearPublicCache();
        return $setting;
    }

    /**
     * Safe helper for resolving a setting key or falling back to Eloquent get().
     */
    public static function get($key = ['*'], $default = null)
    {
        if (is_string($key) && !in_array($key, ['*', 'id', 'key', 'value', 'created_at', 'updated_at', 'deleted_at'])) {
            return static::getSetting($key, $default);
        }

        return static::query()->get(is_array($key) ? $key : func_get_args());
    }

    /**
     * Get the configured platform name or fallback to app name.
     */
    public static function getPlatformName(): string
    {
        $name = static::getSetting('branding_name');
        return !empty($name) ? (string) $name : (config('app.name') ?: 'WhatsOmni');
    }

    /**
     * Get the configured platform tab name.
     */
    public static function getPlatformTabName(): string
    {
        $tab = static::getSetting('tab_name');
        return !empty($tab) ? (string) $tab : static::getPlatformName();
    }

    /**
     * Get the resolved platform logo URL.
     */
    public static function getPlatformLogo(): ?string
    {
        $storedUrl = static::getSetting('logo_url');
        if (empty($storedUrl)) {
            return null;
        }

        if (preg_match('#/storage/(.+)#', $storedUrl, $matches)) {
            return asset('storage/' . $matches[1]);
        }

        if (str_starts_with($storedUrl, 'http://') || str_starts_with($storedUrl, 'https://')) {
            return $storedUrl;
        }

        return asset(ltrim($storedUrl, '/'));
    }

    /**
     * Get the resolved platform favicon URL.
     */
    public static function getPlatformFavicon(): ?string
    {
        $storedUrl = static::getSetting('favicon_url');
        if (empty($storedUrl)) {
            return null;
        }

        if (preg_match('#/storage/(.+)#', $storedUrl, $matches)) {
            return asset('storage/' . $matches[1]);
        }

        if (str_starts_with($storedUrl, 'http://') || str_starts_with($storedUrl, 'https://')) {
            return $storedUrl;
        }

        return asset(ltrim($storedUrl, '/'));
    }

    public function getValueAttribute($value)
    {
        if ($value === null) {
            return null;
        }

        $decoded = json_decode($value, true);

        if ($decoded !== null && is_array($decoded)) {
            return self::decryptRecursive($decoded);
        }

        // Handle string/scalar values
        if (self::isSensitiveKey($this->key ?? '')) {
            try {
                return Crypt::decryptString($value);
            } catch (\Throwable $e) {
                return $value;
            }
        }

        return $decoded !== null ? $decoded : $value;
    }

    public function setValueAttribute($value)
    {
        if ($value === null) {
            $this->attributes['value'] = null;
            return;
        }

        if (is_array($value)) {
            $encrypted = self::encryptRecursive($value);
            $this->attributes['value'] = json_encode($encrypted);
            return;
        }

        if (is_string($value) && self::isSensitiveKey($this->key ?? '')) {
            $this->attributes['value'] = json_encode(self::encryptRecursive($value));
            return;
        }

        $this->attributes['value'] = is_scalar($value) ? json_encode($value) : json_encode($value);
    }
}
