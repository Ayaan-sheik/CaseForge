import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from '@/app/(dashboard)/dashboard/DashboardClient';
import type { CampaignWithResponses } from '@/lib/utils/stalledInfo';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  const [{ data: campaigns }, { data: profile }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('*, responses(id, duration_seconds)')
      .eq('creator_id', user!.id)
      .order('created_at', { ascending: false })
      .returns<CampaignWithResponses[]>(),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user!.id)
      .maybeSingle<{ full_name: string | null }>(),
  ]);

  const firstName = profile?.full_name?.split(' ')[0];

  return (
    <DashboardClient
      campaigns={campaigns ?? []}
      appUrl={appUrl}
      firstName={firstName}
    />
  );
}
