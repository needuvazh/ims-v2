'use client';

import { Button } from '@ims/shared-ui';

export function PrintCertificateButton() {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      Print / Save PDF
    </Button>
  );
}
