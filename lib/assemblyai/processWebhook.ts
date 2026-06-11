import { createAdminClient } from '@/lib/supabase/server';
import { cleanTranscript } from '@/lib/ai/cleanTranscript';
import { synthesizeCaseStudy } from '@/lib/ai/synthesizeCaseStudy';
import type { Campaign, Question } from '@/lib/types';
import { fetchTranscript } from './submitTranscription';

export interface AssemblyAIWebhookPayload {
  transcript_id: string;
  status: string;
  text?: string;
  error?: string;
}

/**
 * Handle one finished transcription: store the raw transcript, clean it with
 * Claude, and — once all of the campaign's questions have clean transcripts —
 * trigger synthesis.
 */
export async function processWebhook(
  payload: AssemblyAIWebhookPayload
): Promise<void> {
  const supabase = createAdminClient();

  const { data: response } = await supabase
    .from('responses')
    .select('id, campaign_id')
    .eq('assemblyai_id', payload.transcript_id)
    .maybeSingle();

  if (!response) {
    console.warn(
      `AssemblyAI webhook for unknown transcript: ${payload.transcript_id}`
    );
    return;
  }

  if (payload.status === 'error') {
    await supabase
      .from('campaigns')
      .update({
        status: 'error',
        error_message: `Transcription failed: ${payload.error ?? 'unknown error'}`,
      })
      .eq('id', response.campaign_id);
    return;
  }

  if (payload.status !== 'completed') return;

  // AssemblyAI webhook bodies typically carry only ids — fetch the text.
  let text = payload.text;
  if (!text) {
    const transcript = await fetchTranscript(payload.transcript_id);
    text = transcript.text ?? '';
  }

  await supabase
    .from('responses')
    .update({ transcript_raw: text })
    .eq('id', response.id);

  const cleaned = await cleanTranscript(text);

  await supabase
    .from('responses')
    .update({ transcript_clean: cleaned })
    .eq('id', response.id);

  // Are all of this campaign's questions transcribed and cleaned?
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', response.campaign_id)
    .single<Campaign>();

  if (!campaign || campaign.status === 'complete') return;

  const questions: Question[] = campaign.questions ?? [];
  const { data: allResponses } = await supabase
    .from('responses')
    .select('question_id, transcript_clean')
    .eq('campaign_id', campaign.id);

  const cleanedIds = new Set(
    (allResponses ?? [])
      .filter((r) => r.transcript_clean)
      .map((r) => r.question_id)
  );

  const allDone =
    questions.length > 0 && questions.every((q) => cleanedIds.has(q.id));

  if (allDone) {
    await synthesizeCaseStudy(campaign.id);
  }
}
