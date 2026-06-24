import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { isFilled } from '@/lib/utils/isFilled';
import { normalizeCaseStudy } from '@/lib/utils/normalizeCaseStudy';
import { deriveLongFormContent } from '@/lib/utils/deriveLongFormContent';
import type { CaseStudy, NarrativeSection } from '@/lib/types';
import { pdfStyles as s } from './pdfStyles';
import { BulletList, ClientSnapshotList, QuoteBox, ResultsTable } from './pdfParts';

export interface CaseStudyLongPDFProps {
  caseStudy: CaseStudy;
  clientName: string;
  serviceProvided?: string;
}

/** True when a section heading reads like the in-depth results section. */
function isResultsHeading(heading: string): boolean {
  return /result/i.test(heading);
}

function Section({
  section,
  clientName,
}: {
  section: NarrativeSection;
  clientName: string;
}) {
  const paragraphs = (section.body ?? []).filter(isFilled);
  if (!isFilled(section.heading) && paragraphs.length === 0) return null;
  return (
    <View style={s.longSection}>
      {isFilled(section.heading) && <Text style={s.longH3}>{section.heading}</Text>}
      {paragraphs.map((p, i) => (
        <Text key={i} style={s.longParagraph}>
          {p}
        </Text>
      ))}
      {section.quote && <QuoteBox quote={section.quote} clientName={clientName} />}
    </View>
  );
}

/**
 * Long-form (~5-page) story case study. A single A4 page that wraps, so the
 * narrative flows and paginates automatically. Plain document look (white page,
 * CaseForge type/colors, accent pull quotes) with centered page numbers.
 */
export function CaseStudyLongPDF({
  caseStudy,
  clientName,
  serviceProvided,
}: CaseStudyLongPDFProps) {
  const cs = normalizeCaseStudy(caseStudy);

  const title = isFilled(cs.headline_result)
    ? cs.headline_result
    : `${clientName} — case study`;

  const realSections = (cs.narrative_sections ?? []).filter(
    (sec) => isFilled(sec.heading) || (sec.body ?? []).some(isFilled)
  );
  const realKeyOutcomes = (cs.key_outcomes ?? []).filter(isFilled);

  // Case studies generated before the long-form fields existed (or where the
  // model under-produced) have no narrative. Fall back to a faithful narrative
  // derived from the structured fields so the long-form is never a 1-page doc.
  const derived = deriveLongFormContent(cs);
  const usingDerived = realSections.length === 0;
  const sections = usingDerived ? derived.narrative_sections : realSections;
  const keyOutcomes = realKeyOutcomes.length > 0 ? realKeyOutcomes : derived.key_outcomes;
  const conclusion = isFilled(cs.conclusion) ? cs.conclusion : derived.conclusion;

  // The headline testimonial sits in the top "results" block only on the rich
  // (LLM) path. In the derived path, quotes are distributed inside the sections,
  // so showing one here too would duplicate it.
  const lead = usingDerived
    ? undefined
    : (cs.quotes ?? []).find((q) => isFilled(q.quote));
  const hasResultsTable = (cs.results ?? []).some(
    (r) => isFilled(r.metric) && (isFilled(r.before) || isFilled(r.after))
  );

  // Drop the results table in after the first results-themed section; if no
  // section reads like results, fall back to before the conclusion.
  const resultsAnchor = sections.findIndex((sec) => isResultsHeading(sec.heading));

  const snapshotRows = [
    { label: 'Client', value: clientName },
    { label: 'Industry', value: cs.industry_size },
    { label: 'Location', value: cs.location ?? '' },
    { label: 'Team size', value: cs.team_size ?? '' },
    { label: 'Service', value: serviceProvided ?? '' },
    { label: 'Timeline', value: cs.timeline },
  ];

  return (
    <Document title={title} author="CaseForge">
      <Page size="A4" style={s.longPage}>
        {/* Header */}
        <View style={s.longSection}>
          <Text style={s.longTitle}>{title}</Text>
        </View>

        {/* Client snapshot */}
        <View style={s.longSection}>
          <Text style={s.longH3}>Client snapshot</Text>
          <ClientSnapshotList rows={snapshotRows} />
        </View>

        {/* The results — qualitative intro */}
        {(keyOutcomes.length > 0 || lead) && (
          <View style={s.longSection}>
            <Text style={s.longH3}>The results</Text>
            {keyOutcomes.length > 0 && (
              <>
                <Text style={s.longParagraph}>Key outcomes:</Text>
                <BulletList items={keyOutcomes} />
              </>
            )}
            {lead && (
              <View style={{ marginTop: 10 }}>
                <QuoteBox quote={lead} clientName={clientName} />
              </View>
            )}
          </View>
        )}

        {/* Narrative story sections, with the results table dropped in after the
            results-themed section (or before the conclusion if none matches). */}
        {sections.map((sec, i) => (
          <React.Fragment key={i}>
            <Section section={sec} clientName={clientName} />
            {hasResultsTable && i === resultsAnchor && (
              <View style={s.longSection}>
                <ResultsTable results={cs.results} />
              </View>
            )}
          </React.Fragment>
        ))}

        {/* Fallback results table when no section was results-themed */}
        {hasResultsTable && resultsAnchor === -1 && (
          <View style={s.longSection}>
            <Text style={s.longH3}>The numbers</Text>
            <ResultsTable results={cs.results} />
          </View>
        )}

        {/* Conclusion */}
        {isFilled(conclusion) && (
          <View style={s.longSection}>
            <Text style={s.longH3}>Conclusion</Text>
            <Text style={s.longParagraph}>{conclusion}</Text>
          </View>
        )}

        <Text
          style={s.pageNumber}
          render={({ pageNumber }) => `${pageNumber}`}
          fixed
        />
      </Page>
    </Document>
  );
}

export default CaseStudyLongPDF;
