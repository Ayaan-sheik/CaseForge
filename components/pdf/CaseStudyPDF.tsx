import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { isFilled } from '@/lib/utils/isFilled';
import type { CaseStudy } from '@/lib/types';

export interface CaseStudyPDFProps {
  caseStudy: CaseStudy;
  clientName: string;
  serviceProvided?: string;
}

// Concrete values for the template's design tokens (react-pdf can't use
// Tailwind/CSS vars). Mirrors tailwind.config.ts.
const colors = {
  bgSecondary: '#F6F3EC', // subtle — page background behind the card
  bgPrimary: '#FFFFFF', // surface — card background
  border: '#E8E4DA', // line
  textPrimary: '#191510', // ink
  textSecondary: '#5C564B', // ink-secondary
  accent: '#EF3B2D', // info / accent
};

const RADIUS_LG = 12;
const RADIUS_MD = 8;

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: colors.textPrimary,
    backgroundColor: colors.bgSecondary,
    padding: 24,
  },
  card: {
    backgroundColor: colors.bgPrimary,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: RADIUS_LG,
  },

  // Header
  header: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  eyebrow: { fontSize: 9.5, color: colors.textSecondary, marginBottom: 5 },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: colors.textPrimary,
    lineHeight: 1.25,
    marginBottom: 6,
  },
  subline: { fontSize: 11, color: colors.textSecondary },

  // Snapshot grid
  snapshot: { flexDirection: 'row', gap: 9, paddingVertical: 18, paddingHorizontal: 24 },
  snapCell: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: RADIUS_MD,
    padding: 10,
  },
  snapLabel: { fontSize: 8.5, color: colors.textSecondary, marginBottom: 4 },
  snapValue: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: colors.textPrimary },

  // Prose sections
  section: { paddingHorizontal: 24, paddingBottom: 14 },
  h3: { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color: colors.textPrimary, marginBottom: 5 },
  body: { fontSize: 11, lineHeight: 1.55, color: colors.textPrimary },

  // What we did — manual ordered list
  listItem: { flexDirection: 'row', marginBottom: 5 },
  listMarker: { width: 16, fontSize: 11, color: colors.textSecondary },
  listText: { flex: 1, fontSize: 11, lineHeight: 1.5, color: colors.textPrimary },

  // Results table
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingVertical: 7,
  },
  tableRowLast: { flexDirection: 'row', paddingVertical: 7 },
  thMetric: { flex: 2, fontSize: 9.5, color: colors.textSecondary },
  thNum: { flex: 1, fontSize: 9.5, color: colors.textSecondary, textAlign: 'right' },
  tdMetric: { flex: 2, fontSize: 10.5, color: colors.textPrimary },
  tdBefore: { flex: 1, fontSize: 10.5, color: colors.textPrimary, textAlign: 'right' },
  tdAfter: {
    flex: 1,
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: colors.textPrimary,
    textAlign: 'right',
  },

  // Testimonial
  quoteBox: {
    backgroundColor: colors.bgSecondary,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    borderTopRightRadius: RADIUS_MD,
    borderBottomRightRadius: RADIUS_MD,
    padding: 14,
  },
  quoteText: {
    fontFamily: 'Times-Italic',
    fontSize: 11.5,
    lineHeight: 1.55,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  quoteAttribution: { fontSize: 9.5, color: colors.textSecondary },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  footerLeft: { fontSize: 9.5, color: colors.textSecondary },
  footerRight: { fontSize: 9.5, color: colors.accent },
});

/** Full case study laid out to match templates/caseforge_case_study_template.html. */
export function CaseStudyPDF({ caseStudy, clientName, serviceProvided }: CaseStudyPDFProps) {
  const cs = caseStudy;

  const title = isFilled(cs.headline_result)
    ? cs.headline_result
    : `${clientName} — case study`;

  const snapshot = (cs.snapshot ?? [])
    .filter((s) => isFilled(s.metric) && (isFilled(s.before) || isFilled(s.after)))
    .slice(0, 4);
  const results = (cs.results ?? []).filter(
    (r) => isFilled(r.metric) && (isFilled(r.before) || isFilled(r.after))
  );
  const steps = (cs.what_we_did ?? []).filter(isFilled);
  const lead = (cs.quotes ?? []).find((q) => isFilled(q.quote));

  const subline = [
    `Client: ${clientName}`,
    isFilled(serviceProvided) ? `Service: ${serviceProvided}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Document title={title} author="CaseForge">
      <Page size="A4" style={styles.page}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            {isFilled(cs.industry_size) && (
              <Text style={styles.eyebrow}>{cs.industry_size}</Text>
            )}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subline}>{subline}</Text>
          </View>

          {/* Snapshot grid */}
          {snapshot.length > 0 && (
            <View style={styles.snapshot}>
              {snapshot.map((s, i) => (
                <View key={i} style={styles.snapCell}>
                  <Text style={styles.snapLabel}>{s.metric}</Text>
                  <Text style={styles.snapValue}>
                    {s.before} → {s.after}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* The challenge */}
          {isFilled(cs.challenge) && (
            <View style={styles.section}>
              <Text style={styles.h3}>The challenge</Text>
              <Text style={styles.body}>{cs.challenge}</Text>
            </View>
          )}

          {/* Why they chose us */}
          {isFilled(cs.why_chose) && (
            <View style={styles.section}>
              <Text style={styles.h3}>
                Why they chose {isFilled(cs.provider_name) ? cs.provider_name : 'us'}
              </Text>
              <Text style={styles.body}>{cs.why_chose}</Text>
            </View>
          )}

          {/* What we did */}
          {steps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.h3}>What we did</Text>
              {steps.map((step, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.listMarker}>{i + 1}.</Text>
                  <Text style={styles.listText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {/* The results */}
          {results.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.h3}>The results</Text>
              <View style={styles.tableRow}>
                <Text style={styles.thMetric}>Metric</Text>
                <Text style={styles.thNum}>Before</Text>
                <Text style={styles.thNum}>After</Text>
              </View>
              {results.map((r, i) => (
                <View key={i} style={i === results.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={styles.tdMetric}>{r.metric}</Text>
                  <Text style={styles.tdBefore}>{r.before}</Text>
                  <Text style={styles.tdAfter}>{r.after}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Testimonial */}
          {lead && (
            <View style={styles.section}>
              <View style={styles.quoteBox}>
                <Text style={styles.quoteText}>&ldquo;{lead.quote}&rdquo;</Text>
                <Text style={styles.quoteAttribution}>
                  {[
                    isFilled(lead.name) ? lead.name : clientName,
                    isFilled(lead.title) ? lead.title : null,
                    clientName,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            </View>
          )}

          {/* Footer */}
          {(isFilled(cs.timeline) || isFilled(cs.cta)) && (
            <View style={styles.footer}>
              <Text style={styles.footerLeft}>{isFilled(cs.timeline) ? cs.timeline : ' '}</Text>
              {isFilled(cs.cta) && <Text style={styles.footerRight}>{cs.cta}</Text>}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}

export default CaseStudyPDF;
