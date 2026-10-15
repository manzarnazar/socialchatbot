<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => null,
    ],

    'ses' => [
        'key' => null,
        'secret' => null,
        'region' => 'us-east-1',
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => null,
            'channel' => null,
        ],
    ],
];
