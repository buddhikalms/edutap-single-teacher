"use client";

import { Download, FileText, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Print invoice" }: { label?: string }) {
  return (
    <>
      <PrintStyles />
      <Button onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        {label}
      </Button>
    </>
  );
}

export function WhatsAppShareButton({ text }: { text: string }) {
  function share() {
    const message = `${text}\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <Button type="button" variant="outline" onClick={share}>
      <MessageCircle className="h-4 w-4" />
      Share WhatsApp
    </Button>
  );
}

export function SharePdfButton({ receiptId, text }: { receiptId: string; text: string }) {
  const pdfUrl = `/api/receipts/${receiptId}/pdf`;

  async function sharePdf() {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      alert("Could not create the PDF. Please try again.");
      return;
    }

    const blob = await response.blob();
    const file = new File([blob], `invoice-${receiptId}.pdf`, { type: "application/pdf" });
    const navigatorWithShare = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };

    if (navigatorWithShare.share && (!navigatorWithShare.canShare || navigatorWithShare.canShare({ files: [file] }))) {
      await navigatorWithShare.share({ title: "Invoice PDF", text: `${text}\nChoose WhatsApp to send the PDF.`, files: [file] });
      return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    URL.revokeObjectURL(url);

    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\nPDF downloaded. Attach the downloaded invoice PDF in WhatsApp.`)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <Button type="button" variant="outline" onClick={sharePdf}>
      <FileText className="h-4 w-4" />
      Share PDF via WhatsApp
    </Button>
  );
}

export function DownloadPdfButton({ receiptId }: { receiptId: string }) {
  return (
    <Button asChild type="button" variant="outline">
      <a href={`/api/receipts/${receiptId}/pdf`} download>
        <Download className="h-4 w-4" />
        Download PDF
      </a>
    </Button>
  );
}

function PrintStyles() {
  return (
    <style>{`
      @media print {
        body { background: white !important; }
        body * { visibility: hidden !important; }
        [data-print-root], [data-print-root] * { visibility: visible !important; }
        [data-print-root] {
          position: absolute !important;
          inset: 0 auto auto 0 !important;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          box-shadow: none !important;
          border: none !important;
        }
        .no-print { display: none !important; }
      }
      @page { size: A4; margin: 14mm; }
    `}</style>
  );
}
