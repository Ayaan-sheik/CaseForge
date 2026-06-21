import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Token-hash confirmation endpoint for Supabase email links.
 *
 * The "Confirm signup" email template points here:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding
 *
 * We verify the OTP server-side (sets the auth cookies via the SSR client) and
 * redirect on to `next`. Unlike the PKCE `?code=` flow, this works even when the
 * link is opened in a different browser/device than the one that signed up.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/onboarding';

  if (token_hash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=Could+not+confirm+email.+Please+try+again.', origin)
  );
}
