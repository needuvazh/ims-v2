import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-guard";
import { prisma } from "@ims/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const quotation = await prisma.quotation.findFirst({
    where: { id, isDeleted: false },
    include: {
      corporateAccount: true,
      branch: true,
      lineItems: {
        where: { isDeleted: false },
        include: { course: true },
      },
    },
  });

  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const logoUrl = `${origin}/alsaud/logo.png`;

  const formatAmt = (n: number) => Number(n || 0).toFixed(3);
  const formatDate = (d: Date | string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-OM", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const lineItemsHtml = quotation.lineItems
    .map(
      (li, i) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px 8px; font-size: 13px; color: #334155;">${i + 1}</td>
      <td style="padding: 12px 8px; font-size: 13px; color: #1e293b; font-weight: 500;">
        ${li.course.nameEnglish} (${li.course.courseCode})
      </td>
      <td style="padding: 12px 8px; font-size: 13px; color: #334155; text-align: center;">${li.quantity}</td>
      <td style="padding: 12px 8px; font-size: 13px; color: #334155; text-align: right;">${formatAmt(Number(li.unitPrice))} OMR</td>
      <td style="padding: 12px 8px; font-size: 13px; font-weight: 600; color: #0f172a; text-align: right;">${formatAmt(Number(li.lineTotal))} OMR</td>
    </tr>
  `
    )
    .join("");

  const subtotal = Number(quotation.subtotal);
  const discount = Number(quotation.discountAmount);
  const tax = Number(quotation.taxAmount);
  const total = Number(quotation.totalAmount);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quotation ${quotation.quotationNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      color: #1e293b;
    }
    .container {
      max-width: 800px;
      margin: 40px auto;
      background-color: #ffffff;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .logo-section h1 {
      font-size: 24px;
      font-weight: 700;
      color: #4f46e5;
      margin: 0;
    }
    .logo-section p {
      font-size: 12px;
      color: #64748b;
      margin: 4px 0 0 0;
    }
    .quote-title {
      text-align: right;
    }
    .quote-title h2 {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .quote-number {
      font-family: monospace;
      font-size: 14px;
      color: #4f46e5;
      font-weight: 600;
      margin-top: 4px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }
    .meta-box h3 {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      margin: 0 0 8px 0;
      letter-spacing: 0.05em;
    }
    .meta-box p {
      font-size: 14px;
      margin: 4px 0;
      color: #334155;
    }
    .meta-box .val {
      font-weight: 600;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
    }
    th {
      background-color: #f8fafc;
      padding: 12px 8px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 2px solid #e2e8f0;
    }
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    .totals-table {
      width: 320px;
      margin: 0;
    }
    .totals-table tr td {
      padding: 8px 0;
      font-size: 14px;
      color: #334155;
    }
    .totals-table tr.grand-total td {
      border-top: 2px solid #e2e8f0;
      padding-top: 12px;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }
    .terms-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .terms-box h4 {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin: 0 0 8px 0;
    }
    .no-print-bar {
      text-align: center;
      padding: 16px;
      background: #4f46e5;
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      justify-content: center;
      gap: 12px;
      align-items: center;
    }
    .btn-print {
      background: #ffffff;
      color: #4f46e5;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 4px rgb(0 0 0 / 0.1);
      transition: all 0.2s;
    }
    .btn-print:hover {
      background: #f1f5f9;
    }
    .btn-back {
      background: transparent;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.4);
      padding: 9px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
    }
    .btn-back:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    @media print {
      body {
        background-color: #ffffff;
      }
      .container {
        margin: 0;
        padding: 0;
        box-shadow: none;
        max-width: 100%;
      }
      .no-print-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <a href="/corporate-sales/leads" class="btn-back">← Back to Leads</a>
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="container">
    <div class="header">
      <div style="display: flex; align-items: center; gap: 16px;">
        <img src="${logoUrl}" alt="ASTI Logo" style="height: 64px; width: auto; object-fit: contain;" />
        <div class="logo-section">
          <h1>Al Saud Training Institute</h1>
          <p>ASTI B2B Corporate Training Solutions</p>
          <p style="margin-top: 4px;">Branch: ${quotation.branch.branchName}</p>
        </div>
      </div>
      <div class="quote-title">
        <h2>QUOTATION</h2>
        <div class="quote-number">${quotation.quotationNumber}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <h3>Prepared For</h3>
        <p class="val">${quotation.corporateAccount.accountName}</p>
        <p>Code: ${quotation.corporateAccount.accountCode}</p>
      </div>
      <div class="meta-box" style="text-align: right;">
        <h3>Quotation Meta</h3>
        <p>Date: <span class="val">${formatDate(quotation.quotationDate)}</span></p>
        <p>Valid Until: <span class="val">${formatDate(quotation.validUntil)}</span></p>
        <p>Status: <span class="val" style="color: #4f46e5;">${quotation.status}</span></p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 50px;">#</th>
          <th style="text-align: left;">Course Details</th>
          <th style="width: 80px; text-align: center;">Seats</th>
          <th style="width: 120px; text-align: right;">Unit Price</th>
          <th style="width: 120px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    <div class="totals-wrapper">
      <table class="totals-table">
        <tr>
          <td>Subtotal (Net)</td>
          <td style="text-align: right; font-weight: 500;">${formatAmt(subtotal)} OMR</td>
        </tr>
        <tr>
          <td>VAT (5%)</td>
          <td style="text-align: right; font-weight: 500;">${formatAmt(tax)} OMR</td>
        </tr>
        <tr class="grand-total">
          <td>Grand Total</td>
          <td style="text-align: right;">${formatAmt(total)} OMR</td>
        </tr>
      </table>
    </div>

    <div class="terms-box">
      <h4>Commercial Terms & Conditions</h4>
      <p style="margin: 4px 0;">1. This quotation is valid only until the date specified above.</p>
      <p style="margin: 4px 0;">2. To confirm this proposal, please sign and return this document along with an official Local Purchase Order (LPO).</p>
      <p style="margin: 4px 0;">3. Payments are subject to the credit rules and terms configured under the client's corporate account contract.</p>
    </div>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
