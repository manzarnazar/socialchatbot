<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F2; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F4F2; padding: 40px 0;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E8E8E6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <!-- Header with Accent Color Background -->
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
                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 40px 40px 30px 40px; color: #1E1E1C;">
                            <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0A0A0A; letter-spacing: -0.3px;">Verify your workspace</h1>
                            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #6B6B6B;">
                                Hello {{ $name ?? 'User' }},<br><br>
                                Thank you for choosing {{ $platformName ?? 'our platform' }}. Please click the button below to confirm your email address and activate your secure multi-tenant workspace.
                            </p>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ $url }}" target="_blank" style="display: inline-block; padding: 12px 32px; background-color: {{ $primaryColor ?? '#4AE54A' }}; color: {{ $accentColor ?? '#0A0A0A' }}; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 6px; transition: background-color 0.2s;">
                                            Activate Account
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #8C8C8C;">
                                If you did not sign up for a {{ $platformName ?? 'platform' }} account, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer Section -->
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
