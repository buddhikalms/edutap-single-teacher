"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CsvExportButton({ filename, csv }: { filename: string; csv: string }) {
  function download() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button onClick={download}>
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
