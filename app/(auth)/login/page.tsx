'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col bg-paper px-7 py-10">
      {/* Wordmark */}
      <div className="mx-auto w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-[9px] font-display text-[19px] font-semibold tracking-[-0.02em] text-ink no-underline"
        >
          <span className="h-[10px] w-[10px] flex-shrink-0 rounded-full bg-accent" />
          CaseForge
        </Link>
      </div>

      {/* Card */}
      <div className="mx-auto mt-14 w-full max-w-sm">
        <div className="animate-fade-up rounded-[20px] border border-line bg-white p-8 shadow-[0_1px_2px_rgba(25,21,16,0.04),0_8px_24px_-12px_rgba(25,21,16,0.1)]">
          <p className="eyebrow">Welcome back</p>
          <h1 className="mt-4 font-display text-[26px] font-semibold leading-tight tracking-[-0.02em]">
            Log in to CaseForge
          </h1>
          <p className="mt-1.5 font-editorial italic text-[15px] text-ink-secondary">
            Pick up where the story left off
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>
            )}
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[14px] text-ink-secondary">
          No account yet?{' '}
          <Link href="/signup" className="font-medium text-ink underline-offset-4 hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </main>
  );
}
