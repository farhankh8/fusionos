'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) { router.push('/'); return null; }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await login(email, password, requiresMfa ? mfaCode : undefined);
      if (result.requiresMfa) { setRequiresMfa(true); setIsLoading(false); return; }
      if (result.success) { router.push('/'); } else { setError(result.error ?? 'Login failed'); }
    } catch { setError('An unexpected error occurred'); } finally { setIsLoading(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF5EC] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#064E3B]">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h1 className="text-xl font-semibold text-[#1C1917]">FusionOS</h1>
          <p className="mt-1 text-[13px] text-[#57534E]">Sign in to your account</p>
        </div>
        <div className="rounded-[10px] border border-[#DDD0BB] bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-md bg-red-50 p-3 text-[13px] text-red-700">{error}</div>}
            {!requiresMfa ? (
              <>
                <div>
                  <label htmlFor="email" className="block text-[13px] font-medium text-[#1C1917]">Email</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full rounded-md border border-[#DDD0BB] px-3 py-2 text-[13px] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]" placeholder="you@example.com" />
                </div>
                <div>
                  <label htmlFor="password" className="block text-[13px] font-medium text-[#1C1917]">Password</label>
                  <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 block w-full rounded-md border border-[#DDD0BB] px-3 py-2 text-[13px] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]" placeholder="••••••••" />
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="mfaCode" className="block text-[13px] font-medium text-[#1C1917]">MFA Code</label>
                <input id="mfaCode" type="text" value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required maxLength={6} className="mt-1 block w-full rounded-md border border-[#DDD0BB] px-3 py-2 text-center text-lg tracking-widest focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]" placeholder="000000" />
              </div>
            )}
            <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center rounded-md bg-[#064E3B] px-4 py-2.5 text-[13px] font-medium text-white hover:bg-[#047857] disabled:opacity-50">
              {isLoading ? 'Signing in...' : requiresMfa ? 'Verify' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-[13px] text-[#57534E]">
          Don&apos;t have an account? <Link href="/auth/register" className="font-medium text-[#064E3B] hover:text-[#047857]">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
