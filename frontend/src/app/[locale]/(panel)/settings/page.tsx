import { redirect } from '@/i18n/routing';

export default function SettingsLandingPage() {
  redirect('/settings/general' as any);
}
