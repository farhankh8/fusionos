'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/auth-client';

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await register(email, password, firstName, lastName);
      if (result.success) setSuccess(true);
      else setError(result.error ?? 'Registration failed');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[#0F172A]">Check your email</h1>
          <p className="mt-2 text-[13px] text-[#64748B]">
            We sent a verification link to <strong>{email}</strong>.
          </p>
          <Link href="/auth/login" className="mt-6 inline-block text-[13px] font-medium text-[#2563EB]">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#2563EB]">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#0F172A]">Create your account</h1>
          <p className="mt-1 text-[13px] text-[#64748B]">Join FusionOS</p>
        </div>
        <div className="rounded-[10px] border border-[#E2E8F0] bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-[13px] text-red-700">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A]">First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-[13px] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A]">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-[13px] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#0F172A]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-[13px] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#0F172A]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1 block w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-[13px] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Min 8 characters"
              />
              <p className="mt-1 text-[11px] text-[#64748B]">Must contain uppercase, lowercase, and a number.</p>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-md bg-[#2563EB] px-4 py-2.5 text-[13px] font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-[13px] text-[#64748B]">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-[#2563EB] hover:text-[#1D4ED8]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
