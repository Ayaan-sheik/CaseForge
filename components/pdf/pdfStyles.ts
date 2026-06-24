import { StyleSheet } from '@react-pdf/renderer';

/**
 * Shared design tokens + style atoms for the case study PDFs (short-form and
 * long-form). react-pdf can't use Tailwind/CSS vars, so these concrete values
 * mirror tailwind.config.ts. Both renderers import from here so the cream-card
 * look stays identical across the two formats.
 */
export const colors = {
  bgSecondary: '#F6F3EC', // subtle — page background behind the card
  bgPrimary: '#FFFFFF', // surface — card background
  border: '#E8E4DA', // line
  textPrimary: '#191510', // ink
  textSecondary: '#5C564B', // ink-secondary
  accent: '#EF3B2D', // info / accent
};

export const RADIUS_LG = 12;
export const RADIUS_MD = 8;

export const pdfStyles = StyleSheet.create({
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

  // Client snapshot list (label: value rows)
  snapList: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 },
  snapRow: { flexDirection: 'row', marginBottom: 4 },
  snapRowLabel: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: colors.textPrimary },
  snapRowValue: { fontSize: 10.5, color: colors.textPrimary },

  // Snapshot stat grid
  snapshot: { flexDirection: 'row', gap: 9, paddingVertical: 18, paddingHorizontal: 24 },
  snapCell: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: RADIUS_MD,
    padding: 10,
  },
  snapLabel: { fontSize: 8.5, color: colors.textSecondary, marginBottom: 4 },
  statAfter: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: colors.textPrimary },
  statFrom: { fontSize: 9, color: colors.textSecondary, marginTop: 2 },

  // Prose sections
  section: { paddingHorizontal: 24, paddingBottom: 14 },
  h3: { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color: colors.textPrimary, marginBottom: 5 },
  body: { fontSize: 11, lineHeight: 1.55, color: colors.textPrimary },
  paragraph: { fontSize: 11, lineHeight: 1.55, color: colors.textPrimary, marginBottom: 8 },

  // Bulleted / ordered lists
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

  // Testimonial / pull quote
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

  // ── Long-form document scale (airier, article-like, to match the template) ──
  longPage: {
    fontFamily: 'Helvetica',
    fontSize: 11.5,
    color: colors.textPrimary,
    backgroundColor: colors.bgPrimary,
    paddingHorizontal: 56,
    paddingVertical: 56,
  },
  longTitle: {
    fontSize: 23,
    fontFamily: 'Helvetica-Bold',
    color: colors.textPrimary,
    lineHeight: 1.3,
    marginBottom: 18,
  },
  longSection: { paddingBottom: 20 },
  longH3: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: colors.textPrimary,
    marginTop: 6,
    marginBottom: 9,
  },
  longParagraph: {
    fontSize: 11.5,
    lineHeight: 1.65,
    color: colors.textPrimary,
    marginBottom: 11,
  },

  // Page number (long-form)
  pageNumber: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    color: colors.textSecondary,
  },
});
