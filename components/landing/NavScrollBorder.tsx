'use client';

import { useEffect } from 'react';

export function NavScrollBorder() {
  useEffect(() => {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const handler = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    handler(); // apply correct state on mount in case the page loads scrolled
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return null;
}
