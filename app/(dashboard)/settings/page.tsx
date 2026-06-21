import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { AgencyContext } from '@/lib/types';
import SettingsClient from './SettingsClient';

const EMPTY_CONTEXT: AgencyContext = {
  what_you_do: '',
  icp: '',
  services: [],
  differentiator: '',
  typical_outcomes: '',
  tone: '',
};

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name, context')
    .eq('id', user!.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard"
        className="mb-8 inline-flex items-center gap-1.5 text-[14px] text-ink-secondary transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <p className="eyebrow">Settings</p>
      <h1 className="mt-3 mb-8 font-display text-[26px] font-semibold leading-tight tracking-[-0.02em]">
        Your business profile
      </h1>

      <SettingsClient
        companyName={profile?.company_name ?? ''}
        context={(profile?.context as AgencyContext) ?? EMPTY_CONTEXT}
      />
    </div>
  );
}
