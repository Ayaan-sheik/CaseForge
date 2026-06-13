import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CampaignPageClient } from '@/app/(dashboard)/campaigns/[id]/CampaignPageClient';
import type { Campaign } from '@/lib/types';

export default async function CampaignPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', params.id)
    .maybeSingle<Campaign>();

  if (!campaign) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (campaign.creator_id !== user?.id) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const magicLink = `${appUrl}/interview/${campaign.magic_token}`;

  return <CampaignPageClient campaign={campaign} magicLink={magicLink} />;
}
