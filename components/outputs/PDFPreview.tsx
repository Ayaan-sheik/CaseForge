/** Embedded preview of the generated case study PDF. */
export function PDFPreview({ pdfUrl }: { pdfUrl: string }) {
  return (
    <iframe
      src={pdfUrl}
      title="Case study PDF preview"
      className="h-[640px] w-full rounded-[20px] border border-line bg-surface shadow-sm"
    />
  );
}
