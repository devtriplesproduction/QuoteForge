import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Send, CreditCard, ListChecks, ReceiptText, Loader2, Receipt } from "lucide-react";
import { DatePicker } from "@/pages/DatePicker";

import CountdownTimer from "@/components/ui/CountdownTimer";

import { Button } from "@/components/ui/button";
// Phase 3A: Invoice document redesign (in this view only). Keep logic untouched.
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { getRepo } from "@/repo";
import { newId } from "@/lib/id";
import { MarkPaymentReceivedModal } from '@/components/invoices/MarkPaymentReceivedModal';
import type { Invoice, InvoiceItem, InvoiceStatus } from "@/lib/types";
import { assertInvoiceEditable, isInvoiceEditable } from "@/lib/invoiceLock";
import { formatCurrency } from "@/lib/types";
import { nowIso } from "@/lib/dates";
import { getQuotationInvoiceStatus } from "@/lib/phase4Invoicing";

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    brandKit,
    currency,
    clients,
    quotations,

    invoices,          // <-- ADD
    invoiceItems,      // <-- ADD

    getInvoiceById,
    listInvoiceItemsByInvoice,
    updateInvoice,
    refreshInvoices,
    refreshInvoiceItems,
    receipts,
    createReceipt,
    refreshReceipts,
    refreshNotifications
  } = useApp();

  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [generatingNext, setGeneratingNext] = useState(false);
  const [notFoundGraceExpired, setNotFoundGraceExpired] = useState(false);
  const [sharingInvoice, setSharingInvoice] = useState(false);

  // Derive invoice reactively from context — no local refetch, no stale closure.
  const invoice = useMemo<Invoice | null>(() => {
    if (!id) return null;
    const inv = getInvoiceById(id);
    if (!inv) return null;

    const q = inv.quotation_id ? quotations.find((x) => x.id === inv.quotation_id) : undefined;
    const clientId = inv.client_id || q?.client_id || null;
    const client = clientId ? clients.find((c) => c.id === clientId) : undefined;

    return {
      ...inv,
      client_id: clientId,
      client: inv.client || q?.client || client,
      quotation: inv.quotation || q,
    } as Invoice;
  }, [id, getInvoiceById, quotations, clients]);

  useEffect(() => {
    if (invoice) {
      setEditDueDate(invoice.due_date || "");
      setEditNotes(invoice.notes || "");
    }
  }, [invoice]);

  // Grace period: if the invoice genuinely isn't found (bad id/deleted), only show
  // "not found" after giving context state a brief moment to catch up on first mount.
  useEffect(() => {
    if (invoice) {
      setNotFoundGraceExpired(false);
      return;
    }
    const t = setTimeout(() => setNotFoundGraceExpired(true), 1500);
    return () => clearTimeout(t);
  }, [invoice, id]);

  const items = useMemo(() => {
    if (!invoice) return [];

    return listInvoiceItemsByInvoice(invoice.id);

  }, [invoice, listInvoiceItemsByInvoice]);

  useEffect(() => {
    if (invoice) {
      const clientName = invoice.client?.business_name || invoice.client?.name || 'Invoice';
      document.title = `${clientName} - ${invoice.invoice_number}`;
    }
  }, [invoice]);

  const invCurrency = invoice?.currency || currency;
  const isEditable = isInvoiceEditable(invoice);
  const linkedQuotation = invoice?.quotation_id ? quotations.find((q) => q.id === invoice.quotation_id) : invoice?.quotation;
  const quotationInvoiceStatus =
    linkedQuotation
      ? getQuotationInvoiceStatus(
        linkedQuotation,
        invoices,
        invoiceItems
      )
      : null;
  const quotationStatus = (invoice?.quotation?.status || linkedQuotation?.status || 'draft');
  const quotationIsDraft = quotationStatus === 'draft';

  const monthlyCooldownEndsAt = useMemo(() => {
    if (!invoice || invoice.type !== "monthly") return null;
    const COOLDOWN_DAYS = 25;
    const createdMs = new Date(invoice.created_at).getTime();
    return createdMs + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  }, [invoice]);

  const isMonthlyInCooldown = useMemo(() => {
    if (!monthlyCooldownEndsAt) return false;
    return Date.now() < monthlyCooldownEndsAt;
  }, [monthlyCooldownEndsAt]);

  // const amountPaid = useMemo(() => {
  //   if (!invoice) return 0;
  //   return invoice.invoice_status === 'paid' ? Number(invoice.amount_due || invoice.total || 0) : Number(invoice.amount_paid || 0);
  // }, [invoice]);

  // const balanceAmount = useMemo(() => {
  //   if (!invoice) return 0;
  //   const bal = typeof invoice.balance_amount === 'number' ? invoice.balance_amount : Math.max(0, Number(invoice.total || 0) - amountPaid);
  //   return Math.max(0, bal);
  // }, [amountPaid, invoice]);

  // const milestoneProgress = useMemo(() => {
  //   if (!invoice?.milestones?.length) return null;
  //   const total = invoice.milestones.length;
  //   const done = invoice.milestones.filter((m) => m.status === 'paid').length;
  //   return { done, total };
  // }, [invoice?.milestones]);

  const totals = useMemo(() => {
    if (!invoice) return null;
    return {
      subtotal: Number(invoice.subtotal || 0),
      discount: Number(invoice.discount || 0),
      tax: Number(invoice.tax_amount || 0),
      total: Number(invoice.total || 0),
      due: Number(invoice.amount_due || 0),
    };
  }, [invoice]);

  const receipt = useMemo(() => {
    if (!invoice) return null;
    return receipts.find((r) => r.invoice_id === invoice.id) || null;
  }, [receipts, invoice?.id]);

  const saveInvoiceDetails = async () => {
    if (!invoice) return;
    assertInvoiceEditable(invoice);

    setSaving(true);
    const patch = {
      due_date: editDueDate || null,
      notes: editNotes || null,
      updated_at: new Date().toISOString(),
    };

    try {
      await updateInvoice({
        ...invoice,
        due_date: patch.due_date,
        notes: patch.notes,
        updated_at: patch.updated_at,
      });
      await refreshInvoices();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to update invoice', err);
    } finally {
      setSaving(false);
    }
  };


  // const handleDownloadPdf = async () => {
  //   if (!invoice) return;

  //   try {
  //     const { pdf } = await import("@react-pdf/renderer");
  //     const InvoiceDocument = (await import("@/documents/InvoiceDocument")).default;

  //     const clientName =
  //       invoice.client?.business_name ||
  //       invoice.client?.name ||
  //       "Client";

  //     const safeClientName = clientName
  //       .replace(/[^a-zA-Z0-9-_ ]/g, "")
  //       .trim();

  //     const safeInvoiceNumber = invoice.invoice_number
  //       .replace(/[^a-zA-Z0-9-_]/g, "_");

  //     const fileName = `${safeClientName}_${safeInvoiceNumber}.pdf`;

  //     const blob = await pdf(
  //       <InvoiceDocument
  //         invoice={invoice}
  //         brandKit={brandKit}
  //         items={items}
  //       />
  //     ).toBlob();

  //     const url = URL.createObjectURL(blob);

  //     const link = document.createElement("a");

  //     link.href = url;
  //     link.download = fileName;

  //     document.body.appendChild(link);

  //     link.click();

  //     document.body.removeChild(link);

  //     URL.revokeObjectURL(url);

  //   } catch (err) {
  //     console.error("PDF generation failed", err);
  //   }
  // };


  const handleDownloadPdf = async () => {
    if (!invoice) return;

    try {
      const clientName =
        invoice.client?.business_name ||
        invoice.client?.name ||
        "Client";

      const customer =
        (invoice.client?.business_name ||
          invoice.client?.name ||
          "Client")
          .replace(/[\\/:*?"<>|]/g, "")
          .trim();

      const invoiceNo =
        invoice.invoice_number?.startsWith("INV-")
          ? invoice.invoice_number
          : `INV-${invoice.invoice_number?.slice(-4) || invoice.id.slice(-4)}`;

      const DOWNLOAD_COUNT_KEY = `qf_invoice_download_count_${invoice.id}`;
      const previousCount = Number(localStorage.getItem(DOWNLOAD_COUNT_KEY) || "0");
      localStorage.setItem(DOWNLOAD_COUNT_KEY, String(previousCount + 1));

      const suffix = previousCount > 0 ? ` (${previousCount})` : "";

      const fileName = `${customer} - ${invoiceNo}${suffix}.pdf`;

      // Acquire the save handle FIRST, immediately on click, while the user
      // gesture is still active — do this before any slow async PDF work,
      // otherwise Chrome throws "Must be handling a user gesture".
      let handle: any = null;
      if ("showSaveFilePicker" in window) {
        try {
          handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: "PDF Document",
                accept: {
                  "application/pdf": [".pdf"],
                },
              },
            ],
          });
        } catch (pickerErr: any) {
          // User cancelled the picker — stop here, don't fall through to download.
          if (pickerErr?.name === "AbortError") return;
          // Any other picker error — fall back to the anchor-download method below.
          handle = null;
        }
      }

      const { pdf } = await import("@react-pdf/renderer");
      const InvoiceDocument =
        (await import("@/documents/InvoiceDocument")).default;

      const blob = await pdf(
        <InvoiceDocument
          invoice={invoice}
          items={items}
          brandKit={brandKit}
        />
      ).toBlob();

      if (handle) {
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      }

      // Fallback for browsers without showSaveFilePicker
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error("PDF generation failed", err);
    }
  };

  const setInvoiceStatus = async (next: InvoiceStatus) => {
    if (!invoice) return;

    // Status transitions are allowed only forward: draft -> sent -> paid.
    if (invoice.invoice_status === "sent" && next === "draft") return;
    if (invoice.invoice_status === "paid" && next !== "paid") return;

    // Strict edit lock: only allow *sending* from draft.
    if (next === "sent") assertInvoiceEditable(invoice);

    const now = new Date().toISOString();

    const patch: Partial<Invoice> & Record<string, unknown> = {
      invoice_status: next,
      sent_at: next === "sent" ? invoice.sent_at || now : invoice.sent_at,
      paid_at: next === "paid" ? invoice.paid_at || now : invoice.paid_at,
    };

    // Keep legacy payment status aligned
    if (next === "paid") patch.status = "paid";

    await updateInvoice({
      ...invoice,
      invoice_status: next,
      sent_at: (patch.sent_at ?? invoice.sent_at) as string | null,
      paid_at: (patch.paid_at ?? invoice.paid_at) as string | null,
      status: (patch.status ?? invoice.status) as Invoice["status"],
      updated_at: nowIso(),
    });
  };

  if (!id) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Invalid invoice.</p>
        <Button onClick={() => navigate("/invoices")}>Back</Button>
      </div>
    );
  }

  if (!invoice || !totals) {
    if (!notFoundGraceExpired) {
      // Briefly loading state instead of the old gray pulse — context is likely just catching up.
      return (
        <div className="min-h-[40vh] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading invoice…</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button onClick={() => navigate("/invoices")}>Back</Button>
      </div>
    );
  }

  return (
    <div className="quotation-preview-page">
      <div className="quotation-preview-actions no-print">
        <div className="flex items-center gap-4">
          <Link to="/invoices">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="quotation-preview-title">Invoice</h1>
            <p className="quotation-preview-subtitle mt-1">{invoice.invoice_number}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button className="gap-2 rounded-xl" onClick={handleDownloadPdf}>
            <Download className="w-4 h-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 max-w-[1320px] mx-auto">
        {/* Left: Document (single source of truth for PDF) */}
        <div>
          <div
            className="doc doc--screen"
            data-invoice-doc
            style={
              {
                "--doc-accent": brandKit?.primary_color || "#111827",
                "--font-heading": brandKit?.font_heading ? `'${brandKit.font_heading}', sans-serif` : undefined,
                "--font-body": brandKit?.font_body ? `'${brandKit.font_body}', sans-serif` : undefined,
              } as CSSProperties
            }
          >
            <div className="doc-card doc-header">
              <div className="doc-pad">
                <div className="doc-header__top">
                  <div className="doc-header__brand">
                    {/* {brandKit?.logo_url ? (
                      <img src={"/Logo.jpg.jpeg"} alt="Logo" className="doc-logo" />
                    ) : (
                      <div className="doc-logoFallback" aria-hidden>

                        <img
                          src="/src/assets/images/Logo.jpg.jpeg"
                          alt="Triple S Production"
                          className="doc-logo"
                        />
                      </div>
                    )} */}
                    <div className="min-w-0">
                      <div className="doc-company truncate"><img src="/triplesimage.png"
                        alt="Triple S Production"
                        className="h-8 w-auto object-contain"
                      />
                      </div>
                      <div className="doc-meta truncate">{brandKit?.website || brandKit?.email || brandKit?.phone || ""}</div>
                    </div>

                  </div>

                  <div
                    className="doc-badge"
                    style={{
                      backgroundColor: brandKit?.primary_color || "#111827",
                      color: "#ffffff",
                    }}
                  >
                    INVOICE
                  </div>
                </div>

                <div className="doc-header__titleRow">
                  <div>
                    <h1 className="doc-title">Invoice</h1>
                    <p className="doc-subtitle">Billing for {invoice.client?.business_name || invoice.client?.name || "Client"}</p>
                  </div>
                  <div className="doc-header__metaBox">
                    <div className="doc-kv">
                      <span className="doc-k">Invoice</span>
                      <span className="doc-v">INV-{invoice.invoice_number?.slice(-4)}</span>
                    </div>
                    <div className="doc-kv">
                      <span className="doc-k">Issue date</span>
                      <span className="doc-v">{(invoice.sent_at || invoice.created_at).slice(0, 10)}</span>
                    </div>
                    {invoice.due_date ? (
                      <div className="doc-kv">
                        <span className="doc-k">Due date</span>
                        <span className="doc-v">{invoice.due_date}</span>
                      </div>
                    ) : null}
                    <div className="doc-kv">
                      <span className="doc-k">Status</span>
                      <span className={`doc-statusPill doc-statusPill--${invoice.invoice_status}`}>{invoice.status.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-stack">
              <div className="doc-card">
                <div className="doc-pad">
                  <div className="doc-twoCol">
                    <div>
                      <div className="doc-sectionTitle">From</div>
                      <div className="doc-block">
                        <div className="doc-strong">Triple S Production</div>

                        {brandKit?.address ? <div className="doc-meta whitespace-pre-wrap">{brandKit.address}</div> : null}
                        <div className="doc-meta">
                          {[brandKit?.email, brandKit?.phone, brandKit?.website].filter(Boolean).join("  •  ") || "—"}
                        </div>
                      </div>
                    </div>

                    {/* <div>
                      <div className="doc-sectionTitle ">Bill To</div>
                      <div className="doc-block">
                        <div className="doc-strong">{invoice.client?.business_name || invoice.client?.name || "—"}</div>
                        {invoice.client?.name && invoice.client?.business_name ? (
                          <div className="doc-meta">Attn: {invoice.client.name}</div>
                        ) : null}
                        {invoice.client?.email ? <div className="doc-meta">{invoice.client.email}</div> : null}
                        {invoice.client?.phone ? <div className="doc-meta">{invoice.client.phone}</div> : null}
                        {invoice.client?.location ? <div className="doc-meta">{invoice.client.location}</div> : null}
                      </div>
                    </div> */}

                    <div className="w-full pl-9">
                      <div className="doc-sectionTitle">Bill To</div>

                      <div className="doc-block">
                        <div className="doc-strong">
                          {invoice.client?.business_name || invoice.client?.name || "—"}
                        </div>

                        {invoice.client?.name && invoice.client?.business_name ? (
                          <div className="doc-meta">
                            Attn: {invoice.client.name}
                          </div>
                        ) : null}

                        {invoice.client?.email ? (
                          <div className="doc-meta">{invoice.client.email}</div>
                        ) : null}

                        {invoice.client?.phone ? (
                          <div className="doc-meta">{invoice.client.phone}</div>
                        ) : null}

                        {invoice.client?.location ? (
                          <div className="doc-meta">{invoice.client.location}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="doc-card">
                <div className="doc-pad">
                  <h2 className="doc-sectionTitle">Services</h2>
                  <div className="doc-tableWrap">
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Service</th>
                          <th>Description</th>
                          <th className="num">Qty</th>
                          <th className="num">Rate</th>
                          <th className="num">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length > 0 ? (
                          items.map((it) => (
                            <tr key={it.id}>
                              <td className="strong">{it.name}</td>
                              <td className="muted whitespace-pre-wrap">{it.description || "—"}</td>
                              <td className="num">{Number(it.quantity || 0)}</td>
                              <td className="num">{formatCurrency(Number(it.unit_price || 0), invCurrency)}</td>
                              <td className="num">{formatCurrency(Number(it.total || 0), invCurrency)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="muted">No items.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="doc-totals">
                    <div className="doc-kv">
                      <span className="doc-k">Subtotal</span>
                      <span className="doc-v">{formatCurrency(totals.subtotal, invCurrency)}</span>
                    </div>
                    {totals.tax > 0 ? (
                      <div className="doc-kv">
                        <span className="doc-k">Tax</span>
                        <span className="doc-v">{formatCurrency(totals.tax, invCurrency)}</span>
                      </div>
                    ) : null}
                    <div className="doc-totalHighlight" style={{ borderColor: brandKit?.primary_color || "#111827" }}>
                      <span className="doc-totalLabel">Total</span>
                      <span className="doc-totalValue" style={{ color: brandKit?.primary_color || "#111827" }}>
                        {formatCurrency(totals.total, invCurrency)}
                      </span>
                    </div>
                    <div className="doc-amountDue" style={{ borderColor: brandKit?.primary_color || "#111827" }}>
                      <span className="doc-amountDueLabel">Amount due</span>
                      <span className="doc-amountDueValue" style={{ color: brandKit?.primary_color || "#111827" }}>
                        {formatCurrency(totals.due, invCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="doc-card">
                <div className="doc-pad">
                  <div className="doc-footerGrid">
                    <div>
                      <h2 className="doc-sectionTitle">Payment info</h2>
                      <div className="doc-paragraph whitespace-pre-wrap">{invoice.notes || "—"}</div>
                    </div>
                    <div>
                      <h2 className="doc-sectionTitle">Details</h2>

                      <div className="doc-signature">
                        {/* Changed marginBottom to marginTop to push the line away from "Details" */}
                        <div className="doc-signLine" style={{ marginTop: "50px" }} />
                        <div className="doc-meta">Authorized signature</div>
                      </div>
                      {invoice.notes && <div className="doc-paragraph whitespace-pre-wrap">{invoice.notes}</div>}
                      <div className="doc-paragraph">{invoice.due_date ? `Payable by ${invoice.due_date}` : "—"}</div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary + Actions */}
        <aside className="no-print lg:sticky lg:top-6 h-fit">
          <div className="glass-card p-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Summary</p>
              <p className="font-heading font-bold text-xl text-foreground mt-1">
                {invoice.client?.business_name || invoice.client?.name || "Client"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Status: {invoice.status.toUpperCase()}</p>
            </div>

            <div className="border-t border-border/50 pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground font-medium">{formatCurrency(totals.subtotal, invCurrency)}</span>
              </div>
              {totals.tax > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-foreground font-medium">{formatCurrency(totals.tax, invCurrency)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between pt-2">
                <span className="font-heading font-semibold text-foreground">Total</span>
                <span className="font-heading font-bold text-2xl text-foreground">{formatCurrency(totals.total, invCurrency)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Amount due</span>
                <span className="text-foreground font-medium">{formatCurrency(totals.due, invCurrency)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full gap-2 rounded-xl  border border-black"
                disabled={quotationIsDraft || sharingInvoice}
                onClick={async () => {
                  setSharingInvoice(true);
                  try {
                    // Keep existing status behavior, but never block link sharing.
                    if (invoice.invoice_status === 'draft') {
                      await setInvoiceStatus('sent');
                    }

                    // Short link: the public page fetches invoice data by ID from the API,
                    // so we don't need to encode the entire invoice into the URL.
                    const publicUrl = `${window.location.origin}/public/invoice/${invoice.id}`;

                    const fallbackCopy = (text: string) => {
                      const ta = document.createElement('textarea');
                      ta.value = text;
                      ta.style.position = 'fixed';
                      ta.style.top = '0';
                      ta.style.left = '0';
                      ta.style.opacity = '0';
                      document.body.appendChild(ta);
                      ta.focus();
                      ta.select();
                      let ok = false;
                      try {
                        ok = document.execCommand('copy');
                      } catch {
                        ok = false;
                      } finally {
                        document.body.removeChild(ta);
                      }
                      return ok;
                    };

                    let copied = false;
                    try {
                      await navigator.clipboard.writeText(publicUrl);
                      copied = true;
                    } catch {
                      copied = false;
                    }

                    if (!copied) {
                      copied = fallbackCopy(publicUrl);
                    }

                    if (copied) {
                      toast({ title: 'Link Copied to clipboard!', description: '' });
                    } else {
                      toast({ title: 'Copy blocked', description: 'Could not copy link.' });
                    }
                  } finally {
                    setSharingInvoice(false);
                  }
                }}
              >
                {sharingInvoice ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {sharingInvoice ? "Copying link..." : "Share Invoice Link"}
              </Button>

              {invoice.invoice_status !== "paid" ? (
                <Button
                  variant="outline"
                  className="w-full gap-2 rounded-xl"
                  disabled={quotationIsDraft}
                  onClick={() => setPayModalOpen(true)}
                >
                  <CreditCard className="w-4 h-4" /> Mark Payment Received
                </Button>
              ) : null}

              {quotationInvoiceStatus?.hasInvoiceableServicesRemaining &&
                invoice.invoice_status === 'paid' ? (
                <Button
                  variant="outline"
                  className="w-full gap-2 rounded-xl"
                  onClick={() => {
                    if (!invoice?.quotation_id) {
                      toast({
                        title: "Quotation not found",
                        description: "Unable to locate the original quotation.",
                        variant: "destructive",
                      });
                      return;
                    }

                    navigate(`/quotations/${invoice.quotation_id}/preview`);
                  }}
                >
                  <ListChecks className="w-4 h-4" />
                  Back to Quotation
                </Button>
              ) : null}

              {invoice.type === "monthly" &&
                invoice.invoice_status === "paid" &&
                !quotationInvoiceStatus?.hasInvoiceableServicesRemaining ? (
                <Button
                  variant="outline"
                  className="w-full gap-2 rounded-xl"
                  disabled={generatingNext || isMonthlyInCooldown}
                  onClick={async () => {
                    if (!invoice) return;
                    setGeneratingNext(true);
                    try {
                      const { generateNextMonthlyInvoice } = await import("@/lib/phase4Invoicing");
                      const nextId = await generateNextMonthlyInvoice(invoice);
                      if (nextId) navigate(`/invoices/${nextId}`);
                      else
                        toast({
                          title: "All months invoiced",
                          description: "Every month for this plan has been invoiced.",
                        });
                    } catch (err) {
                      if (import.meta.env.DEV) console.error("Failed to generate next monthly invoice", err);
                      const message =
                        err instanceof Error ? err.message : "Could not generate next month's invoice.";
                      toast({ title: "Not available yet", description: message });
                    } finally {
                      setGeneratingNext(false);
                    }
                  }}
                >
                  <ListChecks className="w-4 h-4" />
                  {isMonthlyInCooldown && monthlyCooldownEndsAt ? (
                    <CountdownTimer
                      endsAt={monthlyCooldownEndsAt}
                      prefix="Available in"
                      className="tabular-nums"
                    />
                  ) : (
                    "Generate Next Month's Invoice"
                  )}
                </Button>
              ) : null}

              {invoice.type === 'partial' && invoice.invoice_status === 'paid' && Number(invoice.balance_amount) > 0 ? (
                <Button
                  variant="outline"
                  className="w-full gap-2 rounded-xl"
                  disabled={generatingNext}
                  onClick={async () => {
                    if (!invoice) return;
                    setGeneratingNext(true);
                    try {
                      const { generateBalanceInvoice } = await import('@/lib/phase4Invoicing');
                      const nextId = await generateBalanceInvoice(invoice);
                      if (nextId) navigate(`/invoices/${nextId}`);
                      else toast({ title: "Error", description: "Could not generate balance invoice." });
                    } finally {
                      setGeneratingNext(false);
                    }
                  }}
                >
                  <ListChecks className="w-4 h-4" /> Generate Balance Invoice
                </Button>
              ) : null}

              {receipt ? (
                <Link to={`/receipts/${receipt.id}`} className="block mt-3">
                  <Button variant="secondary" className="w-full gap-2 rounded-xl border border-black bg-black text-white hover:bg-white hover:text-black">
                    <ReceiptText className="w-4 h-4" /> View Receipt
                  </Button>
                </Link>
              ) : null}
            </div>

            {invoice.invoice_status !== 'paid' && invoice.payment_method && !receipt ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Client selected <strong>{invoice.payment_method}</strong> — awaiting your confirmation.
              </div>
            ) : null}

            <MarkPaymentReceivedModal
              open={payModalOpen}
              onOpenChange={setPayModalOpen}
              invoice={invoice}
              onConfirm={async ({ method, reference }, reportProgress) => {
                if (!invoice) return;

                reportProgress(10, "Preparing payment record...");

                const now = new Date().toISOString();
                const paidAmount = Number(invoice.amount_due || invoice.total || 0);

                const nextMilestones = invoice.type === 'milestone' && Array.isArray(invoice.milestones)
                  ? invoice.milestones.map((m, idx) => {
                    if (idx === (invoice.milestone_index ?? 0) && m.status !== 'paid') return { ...m, status: 'paid' as const };
                    return m;
                  })
                  : invoice.milestones;

                const existing = receipts.find((r) => r.invoice_id === invoice.id);

                reportProgress(30, "Updating invoice and generating receipt...");

                // These two writes don't depend on each other's result — run in parallel.
                const writes: Promise<unknown>[] = [
                  updateInvoice({
                    ...invoice,
                    invoice_status: 'paid',
                    status: 'paid',
                    paid_at: invoice.paid_at || now,
                    payment_method: method,
                    payment_reference: reference || null,
                    payment_received_at: now,
                    amount_paid: paidAmount,
                    amount_due: 0,
                    milestones: nextMilestones,
                  }),
                ];

                if (!existing) {
                  writes.push(
                    createReceipt({
                      id: invoice.id,
                      receipt_number: `RCPT-${invoice.invoice_number}`,
                      invoice_id: invoice.id,
                      client_id: invoice.client_id,
                      currency: invoice.currency,
                      amount: paidAmount,
                      payment_method: method,
                      payment_reference: reference || null,
                      payment_date: now,
                      notes: null,
                      share_token: null,
                      created_at: now,
                    })
                  );
                }

                await Promise.all(writes);

                reportProgress(75, "Refreshing invoice data...");

                await Promise.all([refreshInvoices(), refreshReceipts()]);

                try {
                  const repo = getRepo();
                  await repo.createNotification({
                    id: newId(),
                    quotation_id: invoice.quotation_id,
                    invoice_id: invoice.id,
                    client_id: invoice.client_id,
                    type: "payment_received",
                    title: "Payment received",
                    message: `Invoice ${invoice.invoice_number} of ${invoice.client?.business_name || invoice.client?.name || "Client"
                      } was marked paid via ${method}.`,
                  });
                  await refreshNotifications();
                } catch {
                  // notification failure shouldn't block the payment flow
                }

                reportProgress(100, "Done!");
              }}
            />

            <div className="border-t border-border/50 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-heading font-semibold text-foreground">Invoice Details</p>
                  <p className="text-sm text-muted-foreground">{isEditable ? "Editable in draft" : "Locked"}</p>
                </div>
                <Button className="rounded-xl" onClick={saveInvoiceDetails} disabled={!isEditable || saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Due Date</Label>

                  <DatePicker
                    value={editDueDate}
                    onChange={(value) => setEditDueDate(value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    disabled={!isEditable}
                    className="min-h-[90px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
