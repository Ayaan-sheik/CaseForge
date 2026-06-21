import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AgencyContext } from '@/lib/types';

/**
 * PATCH /api/profile
 * Body: { company_name?: string, context?: AgencyContext }
 * Updates the creator's profile (global context + agency name).
 */
export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const update: { company_name?: string; context?: AgencyContext } = {};

  if (typeof body.company_name === 'string') {
    update.company_name = body.company_name.trim();
  }

  if (body.context && typeof body.context === 'object') {
    const c = body.context;
    update.context = {
      what_you_do: String(c.what_you_do ?? '').trim(),
      icp: String(c.icp ?? '').trim(),
      services: Array.isArray(c.services)
        ? c.services.map((s: unknown) => String(s).trim()).filter(Boolean)
        : [],
      differentiator: String(c.differentiator ?? '').trim(),
      typical_outcomes: String(c.typical_outcomes ?? '').trim(),
      tone: String(c.tone ?? '').trim(),
    };
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);

  if (error) {
    console.error('Profile update failed:', error);
    return NextResponse.json({ error: 'Could not save changes' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
