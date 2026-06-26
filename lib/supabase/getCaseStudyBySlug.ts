import { createAdminClient } from '@/lib/supabase/server';
import { normalizeCaseStudy } from '@/lib/utils/normalizeCaseStudy';
import type { CaseStudy, Output, ValidatedMetric, StoryBlocks } from '@/lib/types';

interface CaseStudyRecord extends Output {
  campaigns: { client_name: string; service_provided: string } | null;
}

export interface CaseStudyData {
  cs: CaseStudy;
  campaign: { client_name: string; service_provided: string };
  storyBlocks: StoryBlocks | null;
  validatedMetrics: ValidatedMetric[] | null;
  slug: string;
}

export async function getCaseStudyBySlug(slug: string): Promise<CaseStudyData | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('outputs')
    .select('*, campaigns(client_name, service_provided)')
    .eq('web_slug', slug)
    .maybeSingle<CaseStudyRecord>();

  if (!data || !data.campaigns || !data.case_study) return null;

  return {
    cs: normalizeCaseStudy(data.case_study),
    campaign: data.campaigns,
    storyBlocks: (data.story_blocks as StoryBlocks | null) ?? null,
    validatedMetrics: (data.validated_metrics as ValidatedMetric[] | null) ?? null,
    slug,
  };
}
