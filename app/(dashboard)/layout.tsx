import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  async function signOut() {
    'use server';
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/88 backdrop-blur-[10px]">
        <div className="mx-auto flex h-[68px] max-w-page items-center justify-between px-7">
          <Link
            href="/dashboard"
            className="flex items-center gap-[9px] font-display text-[19px] font-semibold tracking-[-0.02em] text-ink no-underline"
          >
            <span className="h-[10px] w-[10px] flex-shrink-0 rounded-full bg-accent" />
            CaseForge
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-[12px] text-ink-secondary sm:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="animate-fade-up mx-auto max-w-page px-7 py-10">
        {children}
      </main>
    </div>
  );
}
