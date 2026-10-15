import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

if (typeof window !== 'undefined') {
  window.Pusher = Pusher;
}

const wsHost = process.env.NEXT_PUBLIC_REVERB_HOST || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
const isSecure = process.env.NEXT_PUBLIC_REVERB_SCHEME === 'https' || (typeof window !== 'undefined' && window.location.protocol === 'https:');
const portVal = process.env.NEXT_PUBLIC_REVERB_PORT
  ? Number(process.env.NEXT_PUBLIC_REVERB_PORT)
  : (typeof window !== 'undefined' && window.location.port ? Number(window.location.port) : (isSecure ? 443 : 80));

export const echo = typeof window !== 'undefined' 
  ? new Echo({
      broadcaster: 'reverb',
      key: process.env.NEXT_PUBLIC_REVERB_APP_KEY || '',
      wsHost,
      wsPort: portVal,
      wssPort: portVal,
      forceTLS: isSecure,
      enabledTransports: ['ws', 'wss'],
      authorizer: (channel: { name: string }, options: any) => {
        return {
          authorize: (socketId: string, callback: (error: any, authData: any) => void) => {
            const isAdminChannel = channel.name.startsWith('admin.');
            const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || '';
            
            const authUrl = isAdminChannel
              ? `${backendBase}/broadcasting/auth`
              : `${backendBase}/api/broadcasting/auth`;
            
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            };

            // Read XSRF-TOKEN cookie to support Laravel CSRF validation
            if (typeof document !== 'undefined') {
              const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'));
              const xsrfToken = match ? decodeURIComponent(match[2]) : '';
              if (xsrfToken) {
                headers['X-XSRF-TOKEN'] = xsrfToken;
              }
            }

            const token = isAdminChannel 
              ? localStorage.getItem('whatsomni_admin_token')
              : localStorage.getItem('whatsomni_token');
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }
            
            fetch(authUrl, {
              method: 'POST',
              headers,
              credentials: 'include',
              body: JSON.stringify({
                socket_id: socketId,
                channel_name: channel.name,
              }),
            })
            .then((res) => {
              if (!res.ok) {
                throw new Error('Unauthorized');
              }
              return res.json();
            })
            .then((data) => {
              callback(null, data);
            })
            .catch((err) => {
              callback(err, null);
            });
          },
        };
      },
    })
  : null;
