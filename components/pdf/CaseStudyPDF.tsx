import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { isFilled } from '@/lib/utils/isFilled';
import type { CaseStudy } from '@/lib/types';

export interface CaseStudyPDFProps {
  caseStudy: CaseStudy;
  clientName: string;
}

const colors = {
  navy: '#0f172a',
  accent: '#6366f1',
  text: '#1e293b',
  lightBg: '#f8fafc',
  muted: '#64748b',
};

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: colors.text, paddingBottom: 56 },
  header: { backgroundColor: colors.navy, paddingVertical: 28, paddingHorizontal: 40 },
  headerLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: '#a5b4fc',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
  },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#ffffff', lineHeight: 1.3 },
  body: { paddingHorizontal: 40, paddingTop: 24 },
  // Snapshot strip
  snapshot: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 16,
    marginBottom: 20,
  },
  snapCell: { flex: 1 },
  snapLabel: {
    fontSize: 7.5,
    letterSpacing: 1.2,
    color: colors.muted,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  snapValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.navy },
  headline: { fontSize: 11.5, fontFamily: 'Helvetica-Oblique', color: colors.muted, lineHeight: 1.5, marginBottom: 24 },
  quoteBox: { backgroundColor: colors.lightBg, borderRadius: 8, padding: 18, marginTop: 4 },
  quoteMark: { fontSize: 42, fontFamily: 'Helvetica-Bold', color: colors.accent, lineHeight: 1, marginBottom: 2 },
  quoteText: { fontSize: 11.5, fontFamily: 'Helvetica-Oblique', lineHeight: 1.55, marginBottom: 12 },
  quoteAttribution: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.navy },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  footerText: { fontSize: 8, color: '#94a3b8' },
});

/** Condensed sales one-pager: headline + before→after snapshot + lead quote. */
export function CaseStudyPDF({ caseStudy, clientName }: CaseStudyPDFProps) {
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const title = isFilled(caseStudy.headline_result)
    ? caseStudy.headline_result
    : `${clientName} — case study`;

  const cells = (caseStudy.snapshot ?? [])
    .filter((s) => isFilled(s.metric) && (isFilled(s.before) || isFilled(s.after)))
    .slice(0, 3)
    .map((s) => ({ label: s.metric.toUpperCase(), value: `${s.before} → ${s.after}` }));

  const lead = (caseStudy.quotes ?? []).find((q) => isFilled(q.quote));
  const leadAttribution = lead && isFilled(lead.name) ? lead.name : clientName;

  return (
    <Document title={title} author="CaseForge">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>CUSTOMER SUCCESS STORY</Text>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.body}>
          {cells.length > 0 && (
            <View style={styles.snapshot}>
              {cells.map((c, i) => (
                <View key={i} style={styles.snapCell}>
                  <Text style={styles.snapLabel}>{c.label}</Text>
                  <Text style={styles.snapValue}>{c.value}</Text>
                </View>
              ))}
            </View>
          )}

          {isFilled(caseStudy.industry_size) && (
            <Text style={styles.headline}>{caseStudy.industry_size}</Text>
          )}

          {lead && (
            <View style={styles.quoteBox}>
              <Text style={styles.quoteMark}>&ldquo;</Text>
              <Text style={styles.quoteText}>{lead.quote}</Text>
              <Text style={styles.quoteAttribution}>— {leadAttribution}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Powered by CaseForge</Text>
          <Text style={styles.footerText}>Generated {generatedDate}</Text>
        </View>
      </Page>
    </Document>
  );
}

export default CaseStudyPDF;
