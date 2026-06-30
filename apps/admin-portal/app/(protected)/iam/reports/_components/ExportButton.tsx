'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@ims/shared-ui';

interface ExportButtonProps {
  reportType: string;
  filters: Record<string, any>;
}

export function ExportButton({ reportType, filters }: ExportButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/reports/iam/${reportType}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'XLSX',
          filters,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to trigger report export.');
      }

      const resBody = await response.json();
      const job = resBody.data?.job;

      if (!job || !job.id) {
        throw new Error('Export job ID was not returned.');
      }

      // Redirect user to the export jobs page to monitor and download when complete
      router.push(`/iam/reports/export-jobs?jobId=${job.id}`);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during export.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-2 bg-[color:var(--ims-brass)] text-white hover:bg-[color:var(--ims-brass-hover)] hover:opacity-90"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        {loading ? 'Exporting...' : 'Export to Excel'}
      </Button>
      {error && <span className="text-xs text-red-500 font-semibold mt-1">{error}</span>}
    </div>
  );
}
