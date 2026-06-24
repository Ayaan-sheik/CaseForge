import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { isFilled } from '@/lib/utils/isFilled';
import { normalizeCaseStudy } from '@/lib/utils/normalizeCaseStudy';
import type { CaseStudy } from '@/lib/types';
import { pdfStyles as s } from './pdfStyles';
import {
  ClientSnapshotList,
  NumberedList,
  QuoteBox,
  ResultsTable,
  SnapshotValue,
} from './pdfParts';

export interface CaseStudyPDFProps {
  caseStudy: CaseStudy;
  clientName: string;
  serviceProvided?: string;
}

/**
 * Short-form case study: a one/two-page summary in the CaseForge cream-card
 * style. Adopts the short template's content (Client Snapshot list, narrative
 * Challenge + Transformation, results table, one pull quote). The long-form
 * story lives in CaseStudyLongPDF.
 */
export function CaseStudyPDF({ caseStudy, clientName, serviceProvided }: CaseStudyPDFProps) {
  const cs = normalizeCaseStudy(caseStudy);

  const title = isFilled(cs.headline_result)
    ? cs.headline_result
    : `${clientName} — case study`;

  const snapshot = (cs.snapshot ?? [])
    .filter((s) => isFilled(s.metric) && (isFilled(s.before) || isFilled(s.after)))
    .slice(0, 4);
  const steps = (cs.what_we_did ?? []).filter(isFilled);
  const lead = (cs.quotes ?? []).find((q) => isFilled(q.quote));

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
      <Page size="A4" style={s.page}>
        <View style={s.card}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>{title}</Text>
          </View>

          {/* Client snapshot */}
          <ClientSnapshotList rows={snapshotRows} />

          {/* Snapshot stat grid */}
          {snapshot.length > 0 && (
            <View style={s.snapshot}>
              {snapshot.map((stat, i) => (
                <View key={i} style={s.snapCell}>
                  <Text style={s.snapLabel}>{stat.metric}</Text>
                  <SnapshotValue before={stat.before} after={stat.after} />
                </View>
              ))}
            </View>
          )}

          {/* The challenge */}
          {isFilled(cs.challenge) && (
            <View style={s.section}>
              <Text style={s.h3}>The challenge</Text>
              <Text style={s.body}>{cs.challenge}</Text>
            </View>
          )}

          {/* What we did */}
          {steps.length > 0 && (
            <View style={s.section}>
              <Text style={s.h3}>
                What {isFilled(cs.provider_name) ? cs.provider_name : 'we'} did
              </Text>
              <NumberedList items={steps} />
            </View>
          )}

          {/* The results */}
          {(cs.results ?? []).length > 0 && (
            <View style={s.section}>
              <Text style={s.h3}>The results</Text>
              <ResultsTable results={cs.results} />
            </View>
          )}

          {/* The transformation */}
          {isFilled(cs.transformation) && (
            <View style={s.section}>
              <Text style={s.h3}>The transformation</Text>
              <Text style={s.body}>{cs.transformation}</Text>
            </View>
          )}

          {/* Testimonial */}
          {lead && (
            <View style={s.section}>
              <QuoteBox quote={lead} clientName={clientName} />
            </View>
          )}

          {/* Footer */}
          {isFilled(cs.cta) && (
            <View style={s.footer}>
              <Text style={s.footerLeft}>{isFilled(cs.timeline) ? cs.timeline : ' '}</Text>
              <Text style={s.footerRight}>{cs.cta}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}

export default CaseStudyPDF;
