'use client';

import { redirect } from 'next/navigation';

export default function LiveChatConfigPage() {
  redirect('/channels');
  return null;
}
