<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Administrator Invitation</title>
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
                            <div style="display: inline-block; padding: 4px 10px; background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 20px; font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                                Administrative Team
                            </div>
                            <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #0A0A0A; letter-spacing: -0.3px;">Administrator Access Invitation</h1>
                            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #525252;">
                                You have been invited to join the SaaS administration team as a <strong style="color: #0A0A0A;">{{ $roleName }}</strong> on {{ $platformName ?? 'our platform' }}.
                            </p>
                            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #525252;">
                                Please click the button below to accept your invitation, verify your credentials, and establish your administrator account security:
                            </p>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ $url }}" target="_blank" style="display: inline-block; padding: 12px 36px; background-color: {{ $primaryColor ?? '#4AE54A' }}; color: {{ $accentColor ?? '#0A0A0A' }}; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                            Accept Administrator Invitation
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #FAFAFA; border: 1px solid #E5E5E5; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
                                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #737373;">
                                    🔒 <strong>Security Notice:</strong> This invitation grants administrative privileges. The link is secure and will expire in 7 days. If you were not expecting this invitation, please notify your system administrator immediately.
                                </p>
                            </div>
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
