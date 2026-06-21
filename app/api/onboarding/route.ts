import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { summarizeContext } from '@/lib/ai/onboarding';

/**
 * POST /api/onboarding
 * Body: { answers: Record<string, string> }
 * Structures the onboarding answers, saves them to the profile, and marks
 * onboarding complete. Returns a confirmation summary.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const answers = body?.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return NextResponse.json({ error: 'answers object is required' }, { status: 400 });
  }

  let result;
  try {
    result = await summarizeContext(answers as Record<string, string>);
  } catch (err) {
    console.error('Onboarding summarize failed:', err);
    return NextResponse.json(
      { error: 'Could not process your answers — please try again' },
      { status: 502 }
    );
  }

  const { error } = await supabase
    .from('profiles')
    .update({ context: result.context, onboarding_complete: true })
    .eq('id', user.id);

  if (error) {
    console.error('Profile update failed:', error);
    return NextResponse.json({ error: 'Could not save your profile' }, { status: 500 });
  }

  return NextResponse.json({ summary: result.summary, context: result.context });
}
