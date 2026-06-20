import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export interface CaseStudyPDFProps {
  title: string;
  summary: string;
  challenge: string;
  solution: string;
  results: string;
  testimonialQuote: string;
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
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.text,
    paddingBottom: 56,
  },
  header: {
    backgroundColor: colors.navy,
    paddingVertical: 28,
    paddingHorizontal: 40,
  },
  headerLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: '#a5b4fc',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    lineHeight: 1.3,
  },
  body: {
    paddingHorizontal: 40,
    paddingTop: 24,
  },
  summary: {
    fontSize: 11.5,
    fontFamily: 'Helvetica-Oblique',
    color: colors.muted,
    lineHeight: 1.5,
    marginBottom: 24,
  },
  columns: {
    flexDirection: 'row',
  },
  leftColumn: {
    width: '60%',
    paddingRight: 20,
  },
  rightColumn: {
    width: '40%',
  },
  sectionHeading: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: colors.accent,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 10,
    lineHeight: 1.55,
    marginBottom: 16,
  },
  quoteBox: {
    backgroundColor: colors.lightBg,
    borderRadius: 8,
    padding: 18,
  },
  quoteMark: {
    fontSize: 42,
    fontFamily: 'Helvetica-Bold',
    color: colors.accent,
    lineHeight: 1,
    marginBottom: 2,
  },
  quoteText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Oblique',
    lineHeight: 1.55,
    marginBottom: 12,
  },
  quoteAttribution: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.navy,
  },
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
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
    color: colors.navy,
  },
});

/** Render `**bold**` markers from the synthesized results text. */
function renderBoldMarkers(text: string) {
  if (typeof text !== 'string') return null;
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <Text key={i} style={styles.bold}>
        {part.slice(2, -2)}
      </Text>
    ) : (
      <Text key={i}>{part}</Text>
    )
  );
}

export function CaseStudyPDF({
  title,
  summary,
  challenge,
  solution,
  results,
  testimonialQuote,
  clientName,
}: CaseStudyPDFProps) {
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document title={title} author="CaseForge">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>CUSTOMER SUCCESS STORY</Text>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.summary}>{summary}</Text>

          <View style={styles.columns}>
            <View style={styles.leftColumn}>
              <Text style={styles.sectionHeading}>THE CHALLENGE</Text>
              <Text style={styles.sectionText}>{challenge}</Text>

              <Text style={styles.sectionHeading}>THE SOLUTION</Text>
              <Text style={styles.sectionText}>{solution}</Text>

              <Text style={styles.sectionHeading}>THE RESULTS</Text>
              <Text style={styles.sectionText}>
                {renderBoldMarkers(results)}
              </Text>
            </View>

            <View style={styles.rightColumn}>
              <View style={styles.quoteBox}>
                <Text style={styles.quoteMark}>&ldquo;</Text>
                <Text style={styles.quoteText}>{testimonialQuote}</Text>
                <Text style={styles.quoteAttribution}>— {clientName}</Text>
              </View>
            </View>
          </View>
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
