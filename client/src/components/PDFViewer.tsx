interface PDFViewerProps {
  contactId: string;
  title?: string;
}

/**
 * PDF Viewer that displays statements from the binary PDF endpoint
 * The endpoint serves raw PDF bytes, which the browser's native PDF viewer can handle
 */
export default function PDFViewer({ contactId, title = 'Statement PDF' }: PDFViewerProps) {
  if (!contactId) {
    return <div className="text-slate-400 text-center py-8">No contact ID provided</div>;
  }

  // Use the binary PDF endpoint instead of base64 data URL
  const pdfUrl = `/api/statements/${contactId}.pdf`;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-lg overflow-hidden">
        <iframe
          src={pdfUrl}
          title={title}
          className="w-full h-[600px] border-0 rounded"
        />
      </div>
      <p className="text-slate-400 text-sm">
        If the PDF doesn't display, you can download it using the Export PDF button above.
      </p>
    </div>
  );
}
