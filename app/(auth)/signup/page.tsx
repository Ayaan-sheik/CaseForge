'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

    setNeedsConfirmation(true);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-7 py-10">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-[9px] font-display text-[19px] font-semibold tracking-[-0.02em] text-ink no-underline"
          >
            <span className="h-[10px] w-[10px] flex-shrink-0 rounded-full bg-accent" />
            CaseForge
          </Link>
        </div>
        {needsConfirmation ? (
          <div className="animate-scale-in rounded-[20px] border border-line bg-white p-8 text-center shadow-[0_1px_2px_rgba(25,21,16,0.04),0_8px_24px_-12px_rgba(25,21,16,0.1)]">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
              <span className="h-3 w-3 rounded-full bg-accent" />
            </div>
            <h2 className="font-display text-[22px] font-semibold tracking-tight">Check your inbox</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">
              We sent a confirmation link to{' '}
              <strong className="text-ink">{email}</strong>. After confirming, you can{' '}
              <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
                log in
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <div className="animate-fade-up rounded-[20px] border border-line bg-white p-8 shadow-[0_1px_2px_rgba(25,21,16,0.04),0_8px_24px_-12px_rgba(25,21,16,0.1)]">
              <p className="eyebrow">Get started</p>
              <h1 className="mt-4 font-display text-[26px] font-semibold leading-tight tracking-[-0.02em]">
                Create your account
              </h1>
              <p className="mt-1.5 font-editorial italic text-[15px] text-ink-secondary">
                First 3 interviews free · No credit card
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                {error && (
                  <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>
                )}
                <Button type="submit" className="h-11 w-full" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account'}
                </Button>
              </form>
            </div>

            <p className="mt-6 text-center text-[14px] text-ink-secondary">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
