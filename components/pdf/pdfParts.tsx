import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { isFilled } from '@/lib/utils/isFilled';
import type { BeforeAfter, ClientQuote } from '@/lib/types';
import { pdfStyles as s } from './pdfStyles';

/**
 * A snapshot cell value: the "after" number large/bold with a muted
 * "from {before}" caption beneath (only when both values exist).
 */
export function SnapshotValue({ before, after }: { before: string; after: string }) {
  const big = isFilled(after) ? after : before;
  const showFrom = isFilled(after) && isFilled(before);
  return (
    <View>
      <Text style={s.statAfter}>{big}</Text>
      {showFrom && <Text style={s.statFrom}>from {before}</Text>}
    </View>
  );
}

/** Client Snapshot list — bold "Label:" + value rows. Omits empty values. */
export function ClientSnapshotList({ rows }: { rows: { label: string; value: string }[] }) {
  const filled = rows.filter((r) => isFilled(r.value));
  if (filled.length === 0) return null;
  return (
    <View style={s.snapList}>
      {filled.map((r, i) => (
        <View key={i} style={s.snapRow}>
          <Text style={s.snapRowLabel}>{r.label}: </Text>
          <Text style={s.snapRowValue}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Metric | Before | After results table. Renders nothing when there are no rows. */
export function ResultsTable({ results }: { results: BeforeAfter[] }) {
  const rows = results.filter(
    (r) => isFilled(r.metric) && (isFilled(r.before) || isFilled(r.after))
  );
  if (rows.length === 0) return null;
  return (
    <View>
      <View style={s.tableRow}>
        <Text style={s.thMetric}>Metric</Text>
        <Text style={s.thNum}>Before</Text>
        <Text style={s.thNum}>After</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={i === rows.length - 1 ? s.tableRowLast : s.tableRow} wrap={false}>
          <Text style={s.tdMetric}>{r.metric}</Text>
          <Text style={s.tdBefore}>{r.before}</Text>
          <Text style={s.tdAfter}>{r.after}</Text>
        </View>
      ))}
    </View>
  );
}

/** Accent-bordered pull quote with attribution. Renders nothing without a quote. */
export function QuoteBox({ quote, clientName }: { quote: ClientQuote; clientName: string }) {
  if (!isFilled(quote.quote)) return null;
  const attribution = [
    isFilled(quote.name) ? quote.name : clientName,
    isFilled(quote.title) ? quote.title : null,
    clientName,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <View style={s.quoteBox} wrap={false}>
      <Text style={s.quoteText}>&ldquo;{quote.quote}&rdquo;</Text>
      <Text style={s.quoteAttribution}>{attribution}</Text>
    </View>
  );
}

/** A bulleted list of strings; empty items dropped. */
export function BulletList({ items }: { items: string[] }) {
  const filled = items.filter(isFilled);
  if (filled.length === 0) return null;
  return (
    <View>
      {filled.map((item, i) => (
        <View key={i} style={s.listItem}>
          <Text style={s.listMarker}>&bull;</Text>
          <Text style={s.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/** A numbered list of strings; empty items dropped. */
export function NumberedList({ items }: { items: string[] }) {
  const filled = items.filter(isFilled);
  if (filled.length === 0) return null;
  return (
    <View>
      {filled.map((item, i) => (
        <View key={i} style={s.listItem}>
          <Text style={s.listMarker}>{i + 1}.</Text>
          <Text style={s.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
