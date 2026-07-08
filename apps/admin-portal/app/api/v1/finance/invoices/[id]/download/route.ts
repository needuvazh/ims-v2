import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-guard';
import { prisma } from '@ims/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, isDeleted: false },
    include: {
      studentProfile: {
        include: { person: true },
      },
      corporateAccount: true,
      branch: true,
      lineItems: true,
      payments: {
        where: { isDeleted: false },
        orderBy: { paymentDate: 'desc' },
        include: { receipt: true },
      },
      refunds: {
        where: { isDeleted: false, status: { in: ['Approved', 'Executed'] } },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const payerName = invoice.studentProfile
    ? `${invoice.studentProfile.person.firstName} ${invoice.studentProfile.person.lastName}`
    : invoice.corporateAccount?.accountName || 'N/A';

  const totalRefunded = invoice.refunds.reduce(
    (s, r) => s + Number(r.amount),
    0,
  );
  const totalPaid = Number(invoice.paidAmount);
  const totalAmount = Number(invoice.totalAmount);
  const outstanding = Number(invoice.outstandingAmount);
  const discountAmount = Number(invoice.discountAmount ?? 0);

  const formatAmt = (n: number) => n.toFixed(3);
  const formatDate = (d: Date | string | null) =>
    d
      ? new Date(d).toLocaleDateString('en-OM', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  const lineItemsHtml = invoice.lineItems
    .map(
      (li, i) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:10px 8px;font-size:12px;color:#374151;">${i + 1}</td>
      <td style="padding:10px 8px;font-size:12px;color:#374151;">${li.descriptionEnglish}</td>
      <td style="padding:10px 8px;font-size:12px;color:#374151;text-align:right;">${li.quantity}</td>
      <td style="padding:10px 8px;font-size:12px;color:#374151;text-align:right;">${formatAmt(Number(li.unitPrice))}</td>
      <td style="padding:10px 8px;font-size:12px;color:#e74c3c;text-align:right;">${li.discountAmount ? `(${formatAmt(Number(li.discountAmount))})` : '—'}</td>
      <td style="padding:10px 8px;font-size:12px;font-weight:600;color:#111827;text-align:right;">${formatAmt(Number(li.lineTotal ?? Number(li.unitPrice) * Number(li.quantity) - Number(li.discountAmount ?? 0)))}</td>
    </tr>
  `,
    )
    .join('');

  const paymentsHtml =
    invoice.payments.length > 0
      ? invoice.payments
          .map(
            (p) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:8px;font-size:11px;color:#374151;">${formatDate(p.paymentDate)}</td>
      <td style="padding:8px;font-size:11px;color:#374151;">${p.paymentMethod}</td>
      <td style="padding:8px;font-size:11px;color:#374151;">${p.referenceNumber || '—'}</td>
      <td style="padding:8px;font-size:11px;font-weight:600;color:#059669;text-align:right;">${formatAmt(Number(p.amount))} ${invoice.currency}</td>
    </tr>
  `,
          )
          .join('')
      : '<tr><td colspan="4" style="padding:12px 8px;font-size:12px;color:#9ca3af;text-align:center;">No payments recorded</td></tr>';

  const statusColor: Record<string, string> = {
    Paid: '#059669',
    PartiallyPaid: '#d97706',
    Overdue: '#dc2626',
    Issued: '#4f46e5',
    Draft: '#6b7280',
    Cancelled: '#9ca3af',
  };
  const sColor = statusColor[invoice.status] || '#6b7280';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #111827; }
    @media print {
      body { background: white; }
      .no-print { display: none !important; }
      .page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; max-width: 100% !important; }
    }
    .page { max-width: 820px; margin: 32px auto; background: white; border-radius: 16px; box-shadow: 0 4px 40px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4f46e5 100%); padding: 36px 40px; color: white; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .institute-name { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .institute-sub { font-size: 12px; color: #c7d2fe; margin-top: 3px; }
    .invoice-label { text-align: right; }
    .invoice-label .tag { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #a5b4fc; }
    .invoice-label .number { font-size: 26px; font-weight: 800; font-family: monospace; }
    .invoice-label .status-badge { display: inline-block; margin-top: 6px; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); }
    .header-meta { margin-top: 28px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .meta-item { background: rgba(255,255,255,0.1); border-radius: 8px; padding: 12px 14px; }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #a5b4fc; }
    .meta-value { font-size: 13px; font-weight: 600; color: white; margin-top: 2px; }
    .body-section { padding: 32px 40px; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; font-weight: 700; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid #f1f5f9; }
    .payer-card { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px; }
    .payer-name { font-size: 16px; font-weight: 700; color: #111827; }
    .payer-type { font-size: 11px; color: #6b7280; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f8fafc; padding: 10px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 700; text-align: left; border-bottom: 2px solid #e5e7eb; }
    th:last-child, th:nth-child(3), th:nth-child(4), th:nth-child(5) { text-align: right; }
    .totals-section { margin-top: 24px; display: flex; justify-content: flex-end; }
    .totals-box { width: 300px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #374151; }
    .total-row.big { font-size: 16px; font-weight: 800; color: #111827; border-top: 2px solid #e5e7eb; margin-top: 8px; padding-top: 10px; }
    .total-row.discount { color: #dc2626; }
    .total-row.refund { color: #d97706; }
    .total-row.paid { color: #059669; }
    .payments-section { margin-top: 32px; }
    .footer { background: #f8fafc; border-top: 1px solid #e5e7eb; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; }
    .footer-note { font-size: 11px; color: #9ca3af; }
    .btn-print { no-print: true; background: #4f46e5; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;padding:16px;background:#4f46e5;">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-top">
        <div>
          <div class="institute-name">Al-Saud Training Institute</div>
          <div class="institute-sub">${invoice.branch?.branchName || ''} · ${invoice.branch?.branchCode || ''}</div>
        </div>
        <div class="invoice-label">
          <div class="tag">Invoice</div>
          <div class="number">${invoice.invoiceNumber}</div>
          <div class="status-badge">${invoice.status}</div>
        </div>
      </div>
      <div class="header-meta">
        <div class="meta-item">
          <div class="meta-label">Invoice Date</div>
          <div class="meta-value">${formatDate(invoice.invoiceDate)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Due Date</div>
          <div class="meta-value">${formatDate(invoice.dueDate)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Currency</div>
          <div class="meta-value">${invoice.currency}</div>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="body-section">
      <!-- Payer -->
      <div class="section-title">Bill To</div>
      <div class="payer-card">
        <div class="payer-name">${payerName}</div>
        <div class="payer-type">${invoice.category} · ${invoice.subCategory || 'Full Payment'}</div>
      </div>

      <!-- Line Items -->
      <div class="section-title">Line Items</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th style="text-align:right;">Qty</th>
            <th style="text-align:right;">Unit Price</th>
            <th style="text-align:right;">Discount</th>
            <th style="text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>

      <!-- Totals -->
      <div class="totals-section">
        <div class="totals-box">
          <div class="total-row">
            <span>Subtotal</span>
            <span>${formatAmt(totalAmount + discountAmount)} ${invoice.currency}</span>
          </div>
          ${discountAmount > 0 ? `<div class="total-row discount"><span>Discount</span><span>(${formatAmt(discountAmount)} ${invoice.currency})</span></div>` : ''}
          <div class="total-row big">
            <span>Total</span>
            <span>${formatAmt(totalAmount)} ${invoice.currency}</span>
          </div>
          <div class="total-row paid">
            <span>Amount Paid</span>
            <span>${formatAmt(totalPaid)} ${invoice.currency}</span>
          </div>
          ${totalRefunded > 0 ? `<div class="total-row refund"><span>Refunded</span><span>(${formatAmt(totalRefunded)} ${invoice.currency})</span></div>` : ''}
          <div class="total-row" style="font-weight:700;color:${outstanding > 0 ? '#dc2626' : '#059669'};">
            <span>Outstanding</span>
            <span>${formatAmt(outstanding)} ${invoice.currency}</span>
          </div>
        </div>
      </div>

      <!-- Payment History -->
      <div class="payments-section">
        <div class="section-title">Payment History</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Method</th>
              <th>Reference</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${paymentsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-note">
        Generated on ${new Date().toLocaleString('en-OM')} · Al-Saud Training Institute
      </div>
      <div class="footer-note" style="color:#4f46e5;font-weight:600;">${invoice.invoiceNumber}</div>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.html"`,
    },
  });
}
