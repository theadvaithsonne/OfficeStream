'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Landing page for Google OAuth redirect.
 * Server sends: /auth/callback?token=<access_token>
 * We store the token and redirect to the dashboard.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('accessToken', token);
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router, searchParams]);

  return (
    <div className="flex h-full items-center justify-center bg-[#1a1a2e]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
        <p className="text-sm text-[#a0aec0]">Signing you in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center bg-[#1a1a2e]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
          <p className="text-sm text-[#a0aec0]">Loading…</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
