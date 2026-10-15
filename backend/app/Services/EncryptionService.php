<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;

class EncryptionService
{
    /**
     * Encrypt a value using AES-256.
     *
     * @param mixed $value
     * @return string
     */
    public static function encrypt(mixed $value): string
    {
        return Crypt::encrypt($value);
    }

    /**
     * Decrypt a value.
     *
     * @param string $payload
     * @return mixed
     */
    public static function decrypt(string $payload): mixed
    {
        return Crypt::decrypt($payload);
    }
}
