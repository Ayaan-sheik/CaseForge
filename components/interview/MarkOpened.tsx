'use client';

import { useEffect, useRef } from 'react';

/**
 * Fires once when the respondent opens the interview landing page:
 * PATCH transitions the campaign sent → recording and notifies the creator.
 */
export function MarkOpened({ token }: { token: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fetch(`/api/interview/${token}`, { method: 'PATCH' }).catch(() => {
      // Non-critical — the recording flow still works
    });
  }, [token]);

  return null;
}
