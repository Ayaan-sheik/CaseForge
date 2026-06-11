import Link from 'next/link';
import { Mic, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { CampaignCard } from '@/components/dashboard/CampaignCard';
import type { Campaign } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('creator_id', user!.id)
    .order('created_at', { ascending: false })
    .returns<Campaign[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-slate-500">
            {campaigns?.length
              ? `${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'}`
              : 'Turn client wins into published proof'}
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="h-4 w-4" />
            New campaign
          </Button>
        </Link>
      </div>

      {campaigns && campaigns.length > 0 ? (
        <div className="mt-8 space-y-3">
          {campaigns.map((campaign, i) => (
            <div
              key={campaign.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}
            >
              <CampaignCard campaign={campaign} />
            </div>
          ))}
        </div>
      ) : (
        <div className="animate-scale-in mt-10 flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900">
            <Mic className="h-7 w-7 text-white" />
          </div>
          <h2 className="mt-6 text-lg font-semibold tracking-tight">
            No campaigns yet
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            Send a magic link to a client and turn their voice answers into a
            polished case study — PDF, web page, and LinkedIn quotes included.
          </p>
          <Link href="/campaigns/new" className="mt-8">
            <Button size="lg">Create your first campaign</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
