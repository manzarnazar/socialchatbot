<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mailer Test</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F2; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F4F2; padding: 40px 0;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E8E8E6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <tr>
                        <td align="center" style="background-color: {{ $accentColor ?? '#0A0A0A' }}; padding: 30px 40px;">
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                                        @if(!empty($platformLogo))
                                            <img src="{{ $platformLogo }}" alt="{{ $platformName ?? 'WhatsOmni' }}" style="max-height: 36px; max-width: 180px; height: auto; display: block; margin: 0 auto 10px auto;" />
                                        @endif
                                        <span>{{ $platformName ?? 'WhatsOmni' }}</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 40px 30px 40px; color: #1E1E1C;">
                            <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0A0A0A; letter-spacing: -0.3px;">Platform Mailer Connection Test</h1>
                            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #6B6B6B;">
                                Your platform mail server settings for <strong>{{ $platformName ?? 'WhatsOmni' }}</strong> are properly configured and working as expected.
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #8C8C8C;">
                                Sent on: {{ now()->toDayDateTimeString() }}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #F9F9F8; padding: 20px 40px; border-top: 1px solid #F0F0EE; text-align: center; font-size: 11px; color: #A0A0A0;">
                            © {{ date('Y') }} {{ $platformName ?? 'WhatsOmni' }}. All rights reserved.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
