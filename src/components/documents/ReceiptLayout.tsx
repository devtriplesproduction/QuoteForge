//ReceiptLayout.tsx

import { useMemo } from 'react';

import { formatCurrency } from '@/lib/types';
import type {
  BrandKit,
  Client,
  Invoice,
  Receipt,
  Quotation,
  InvoiceItem,
} from "@/lib/types";

export type ReceiptLayoutMode = 'screen' | 'print';

type Props = {
  receipt: Receipt;
  invoice?: Invoice | null;
  client?: Client | null;
  brandKit?: BrandKit | null;
  mode?: ReceiptLayoutMode;
  quotation?: Quotation | null;
  invoiceItems?: InvoiceItem[];
};

const normalizeHex = (hex: string) => {
  const h = hex.trim().replace('#', '');
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  return h.length === 6 ? `#${h}` : '';
};

export function ReceiptLayout({
  receipt,
  invoice,
  client,
  brandKit,
  quotation,
  invoiceItems = [],
}: Props) {
  const brandColor = useMemo(() => normalizeHex(brandKit?.primary_color || '#111827') || '#111827', [brandKit?.primary_color]);
  const companyName = brandKit?.company_name || 'Triple S Production';

  const c = client || invoice?.client || receipt.client || null;
  const receiptDate = (receipt.payment_date || receipt.created_at || '').slice(0, 10);
  const invoiceNumber = invoice?.invoice_number || receipt.invoice_id || '—';
  const cur = receipt.currency || invoice?.currency;

  const invoiceTotal = Number(invoice?.total || 0);
  const totalPaid = Number(invoice?.amount_paid || receipt.amount || 0);
  const balanceDue = invoice ? Number(invoice.amount_due || 0) : 0;

  const rows = useMemo(() => {
    const items: Array<{ name: string; desc?: string; amount: number; type: string }> = [];

    // if (invoice?.type === 'milestone' && invoice.milestones) {
    //   const mIndex = invoice.milestone_index ?? -1;
    //   const milestone = invoice.milestones[mIndex];
    //   if (milestone) {
    //     items.push({
    //       name: milestone.label,
    //       desc: `Milestone ${mIndex + 1} of ${invoice.milestones.length}`,
    //       amount: Number(receipt.amount),
    //       type: 'Milestone'
    //     });
    //     return items;
    //   }
    // }


    // if (invoiceItems.length > 0) {

    //   invoiceItems.forEach((item) => {

    //     items.push({
    //       name: item.name,
    //       desc: item.description || "",
    //       amount: Number(item.total),
    //       type: "Service",
    //     });

    //   });

    // }

    if (invoiceItems.length > 0) {

      invoiceItems.forEach((item) => {

        const desc = item.description || "";

        const isMonthly = /^Month\s+\d+\s+of\s+\d+/i.test(desc);
        const isMilestone = /\(\s*\d+(\.\d+)?\s*%\s*\)/.test(desc);

        items.push({

          name: item.name,

          desc,

          amount: Number(item.total),

          type: isMonthly
            ? "Monthly"
            : isMilestone
              ? "Milestone"
              : "One-Time",

        });

      });

      return items;

    }

    if (items.length === 0) {
      items.push({
        name: `Payment for Invoice #${invoiceNumber?.slice(-4)}`,
        desc: receipt.payment_reference || '',
        amount: Number(receipt.amount),
        type: 'Payment'
      });
    }

    return items;
  }, [invoice, quotation, receipt, invoiceNumber, invoiceItems]);

  return (
    <div className="doc" data-receipt-doc>
      {/* 
        A4 Min Height ~ 1123px (297mm @ 96dpi). 
        To prevent footer collapse, we use min-h-[1100px] and flex-col layout.
      */}
      <div className="doc-page flex flex-col" style={{ padding: '0', background: '#fff' }}>

        <div>
          {/* Header Section */}
          <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-8">
            {/* Company Details */}
            <div className="space-y-3 max-w-[50%]">
              <div className="flex items-center gap-3">
                {brandKit?.logo_url ? (
                  <img src={brandKit.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg font-bold text-gray-700">
                    {companyName.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{companyName}</h2>
                <div className="text-sm text-gray-500 space-y-1 mt-1 leading-relaxed">
                  {brandKit?.address && (
                    <p className="whitespace-pre-wrap">{brandKit.address}</p>
                  )}

                  {brandKit?.email && (
                    <p>{brandKit.email}</p>
                  )}

                  {brandKit?.phone && (
                    <p>{brandKit.phone}</p>
                  )}

                  {brandKit?.website && (
                    <p>{brandKit.website}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Receipt Title & Meta */}
            <div className="text-right">
              <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-gray-900 text-white font-bold text-[10px] uppercase tracking-widest mb-3">
                Payment Receipt
              </div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight" style={{ color: brandColor }}>
                PAID
              </h1>

              <div className="mt-4 space-y-1 text-xs">
                <div className="flex justify-end gap-4 items-center">
                  <span className="text-gray-400 font-medium uppercase tracking-wider">Receipt No</span>
                  <span className="text-gray-900 font-mono font-bold">RCPT-{receipt.receipt_number?.slice(-4) || receipt.id?.slice(-4)}</span>
                </div>
                <div className="flex justify-end gap-4 items-center">
                  <span className="text-gray-400 font-medium uppercase tracking-wider">Date</span>
                  <span className="text-gray-900 font-semibold">{receiptDate}</span>
                </div>
                <div className="flex justify-end gap-4 items-center">
                  <span className="text-gray-400 font-medium uppercase tracking-wider">Invoice Ref</span>
                  <span className="text-gray-900 font-semibold">INV-{invoiceNumber?.slice(-4)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Two Columns: Received From + Payment Summary */}
          <div className="grid grid-cols-2 gap-12 mb-10">
            {/* Left: Received From */}
            <div className="pr-4">
              <h3 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3">Received From</h3>
              <div className="text-gray-900 text-sm">
                <p className="font-bold text-base leading-snug">{c?.business_name || c?.name || '—'}</p>
                {c?.name && c?.business_name && <p className="text-gray-600 mt-0.5">Attn: {c.name}</p>}
                <div className="text-gray-500 mt-2 space-y-0.5 font-light leading-relaxed">
                  {c?.address && <p className="whitespace-pre-wrap">{c.address}</p>}
                  {c?.email && <p>{c.email}</p>}
                  {c?.phone && <p>{c.phone}</p>}
                </div>
              </div>
            </div>

            {/* Right: Payment Details Highlight */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Payment Method</span>
                  <span className="font-bold text-gray-900 capitalize">{receipt.payment_method || '—'}</span>
                </div>
                {receipt.payment_reference && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Reference ID</span>
                    <span className="font-mono text-xs text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm">
                      {receipt.payment_reference}
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200 mt-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-bold text-gray-900">Total Received</span>
                    <span className="text-xl font-extrabold" style={{ color: brandColor }}>
                      {formatCurrency(Number(receipt.amount || 0), cur)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Service / Payment Table */}
          <div className="mb-8">
            <table className="w-full text-sm text-left border-collapse border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-2.5 pl-4 pr-2 font-bold text-gray-700 uppercase text-[10px] tracking-wider w-[40%]">Service / Item</th>
                  <th className="py-2.5 px-2 font-bold text-gray-700 uppercase text-[10px] tracking-wider border-l border-gray-200">Type</th>
                  <th className="py-2.5 px-2 font-bold text-gray-700 uppercase text-[10px] tracking-wider border-l border-gray-200">Description</th>
                  <th className="py-2.5 pr-4 pl-2 font-bold text-gray-700 uppercase text-[10px] tracking-wider text-right border-l border-gray-200">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-3 pl-4 pr-2 align-top">
                      <span className="font-semibold text-gray-900 text-xs">{row.name}</span>
                    </td>
                    <td className="py-3 px-2 align-top border-l border-gray-200">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[5px] font-small bg-gray-100 text-gray-600 uppercase">
                        {row.type}
                      </span>
                    </td>
                    <td className="py-3 px-2 align-top text-gray-500 leading-relaxed text-[11px] border-l border-gray-200">
                      {row.desc || '—'}
                    </td>
                    <td className="py-3 pr-4 pl-2 align-top text-gray-900 font-bold text-right font-mono text-xs border-l border-gray-200">
                      {formatCurrency(row.amount, cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section - Reduced Gap */}
          <div className="flex justify-end mb-6">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">Invoice Amount</span>
                <span className="text-gray-900 font-medium">{formatCurrency(invoiceTotal, cur)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200 pb-2">
                <span className="text-gray-500">Total Paid</span>
                <span className="text-gray-900 font-medium">{formatCurrency(totalPaid, cur)}</span>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-gray-900 font-bold text-base">Balance Due</span>
                <span className="text-gray-900 font-bold text-lg">
                  {formatCurrency(balanceDue, cur)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed Layout */}
        <div className="mt-4 border-t border-gray-200 pt-6">
          <div className="flex justify-between items-end pb-4">
            <div className="text-xs text-gray-500 max-w-md space-y-2">
              <div>
                <p className="font-bold text-gray-900 text-sm">Thank you for your business!</p>
                <p className="mt-1">
                  If you have any questions, please contact us at:
                </p>
                <p className="font-medium text-gray-900">8956183973</p>
              </div>
              <p className="opacity-70 text-[10px]">
                This is a system-generated receipt. No signature required.
              </p>
            </div>

            <div className="text-center">
              {/* Visual placeholder for signature */}
              <div className="h-12 w-40 mb-1 flex items-end justify-center">
                {/* Authorized Signature Image would go here */}
              </div>
              <div className="border-t border-gray-300 w-40 pt-1">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Authorized Signature</p>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center border-t border-gray-50">
            <p className="text-[10px] text-gray-900 uppercase tracking-widest">
              {companyName} • Receipt-{receipt.receipt_number?.slice(-4) || receipt.id?.slice(-4)}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
