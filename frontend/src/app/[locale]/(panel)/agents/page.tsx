'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import SimpleLoader from '@/components/ui/SimpleLoader';

export default function AgentsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/chatbot');
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center bg-white h-full w-full select-none">
      <SimpleLoader fullScreen={false} borderless message="Redirecting to AI ChatBot..." />
    </div>
  );
}
