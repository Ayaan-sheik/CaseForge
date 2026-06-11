'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoMark } from '@/components/ui/logo';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, company_name: companyName },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // A DB trigger creates the profiles row from auth metadata; fill in the
    // company name here (the trigger only copies full_name).
    if (data.session && data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        company_name: companyName,
      });
      router.push('/dashboard');
      router.refresh();
      return;
    }

    // Email confirmation is enabled on this Supabase project
    setNeedsConfirmation(true);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="animate-fade-up flex flex-col items-center text-center">
          <Link href="/">
            <LogoMark className="h-11 w-11 rounded-[14px]" animated />
          </Link>
          <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1.5 font-editorial text-base italic text-ink-muted">
            Your client wins, told properly
          </p>
        </div>

        {needsConfirmation ? (
          <div
            className="animate-scale-in mt-10 rounded-[20px] border border-line bg-surface p-6 text-center"
            style={{ animationDelay: '120ms' }}
          >
            <p className="text-sm leading-relaxed text-ink-secondary">
              Check your inbox — we sent a confirmation link to{' '}
              <strong className="text-ink">{email}</strong>. After confirming,
              you can{' '}
              <Link
                href="/login"
                className="font-medium text-ink underline-offset-4 hover:underline"
              >
                log in
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="animate-fade-up mt-10 space-y-5"
              style={{ animationDelay: '120ms' }}
            >
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Rivera Consulting"
                />
              </div>
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
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              {error && <p className="text-sm text-accent">{error}</p>}
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? 'Creating account…' : 'Sign up'}
              </Button>
            </form>

            <p
              className="animate-fade-up mt-8 text-center text-sm text-ink-secondary"
              style={{ animationDelay: '200ms' }}
            >
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-ink underline-offset-4 hover:underline"
              >
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
