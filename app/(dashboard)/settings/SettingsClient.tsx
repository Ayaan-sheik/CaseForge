'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AgencyContext } from '@/lib/types';

interface Props {
  companyName: string;
  context: AgencyContext;
}

const EMPTY: AgencyContext = {
  what_you_do: '',
  icp: '',
  services: [],
  differentiator: '',
  typical_outcomes: '',
  tone: '',
};

export default function SettingsClient({ companyName, context }: Props) {
  const [company, setCompany] = useState(companyName);
  const [form, setForm] = useState<AgencyContext>({ ...EMPTY, ...context });
  // Services edited as one-per-line text; converted to an array on save.
  const [servicesText, setServicesText] = useState((context.services ?? []).join('\n'));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof AgencyContext>(key: K, value: AgencyContext[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    setSaved(false);

    const services = servicesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: company, context: { ...form, services } }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? 'Could not save — please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[20px] border border-line bg-white p-8">
        <h2 className="font-display text-[18px] font-semibold tracking-tight">Agency</h2>
        <div className="mt-5 space-y-2">
          <Label htmlFor="company">Company name</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              setSaved(false);
            }}
          />
        </div>
      </section>

      <section className="rounded-[20px] border border-line bg-white p-8">
        <h2 className="font-display text-[18px] font-semibold tracking-tight">Global context</h2>
        <p className="mt-1.5 font-editorial italic text-[14px] text-ink-secondary">
          Used to brief every campaign&apos;s questions and case studies.
        </p>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="what_you_do">What you do</Label>
            <Textarea
              id="what_you_do"
              rows={2}
              value={form.what_you_do}
              onChange={(e) => set('what_you_do', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="icp">Ideal client</Label>
            <Textarea
              id="icp"
              rows={2}
              value={form.icp}
              onChange={(e) => set('icp', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="services">Services (one per line)</Label>
            <Textarea
              id="services"
              rows={4}
              value={servicesText}
              onChange={(e) => {
                setServicesText(e.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="differentiator">What makes you different</Label>
            <Textarea
              id="differentiator"
              rows={2}
              value={form.differentiator}
              onChange={(e) => set('differentiator', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="typical_outcomes">Typical outcomes</Label>
            <Textarea
              id="typical_outcomes"
              rows={2}
              value={form.typical_outcomes}
              onChange={(e) => set('typical_outcomes', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tone">Case study voice</Label>
            <Input id="tone" value={form.tone} onChange={(e) => set('tone', e.target.value)} />
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving…' : 'Save changes'}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-[14px] text-success">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
