"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ReportDownloadProps {
  data: any[];
  filename: string;
  label?: string;
}

export function ReportDownload({ data, filename, label = "Download CSV" }: ReportDownloadProps) {
  const downloadCSV = () => {
    if (!data || data.length === 0) {
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escape quotes and wrap in quotes if contains comma
            const stringValue = String(value ?? "");
            if (stringValue.includes(",") || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(",")
      ),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button onClick={downloadCSV} variant="outline" size="sm">
      <Download className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
