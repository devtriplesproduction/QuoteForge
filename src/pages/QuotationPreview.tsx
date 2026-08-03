import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Send, CreditCard, FileText } from "lucide-react";

import CountdownTimer from "@/components/ui/CountdownTimer";

import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import type { Quotation } from "@/lib/types";
import { QuotationLayout } from "@/components/quotation/QuotationLayout";

const QUOTATION_LOADING_MESSAGES = [
  "Loading quotation...",
  "Fetching client details...",
  "Preparing document...",
];

import { pdf } from "@react-pdf/renderer";

import { GenerateInvoiceModal } from "@/components/invoices/GenerateInvoiceModal";
import {
  getQuotationServiceBlocks, getQuotationTotalsForDisplay,
  type QuotationServiceBlock,
} from "@/lib/quotationServiceBlocks";

import {
  getServiceInvoiceEligibility,
} from "@/lib/phase4Invoicing";
import ProfessionalQuotationPDF from "@/components/quotation/ProfessionalQuotationPDF";
import ProfessionalQuotationLayout from "@/components/quotation/ProfessionalQuotationLayout";

export default function QuotationPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { brandKit, loading: appLoading, updateQuotation, refreshQuotations, refreshInvoices, refreshInvoiceItems, getQuotationById, invoices, invoiceItems } = useApp();

  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadMsgIndex, setLoadMsgIndex] = useState(0);

  const isPageLoading = appLoading || loading;

  // Simulated progress: climbs toward 90% while waiting, snaps to 100% on completion.
  useEffect(() => {
    if (!isPageLoading) {
      setLoadingProgress(100);
      const reset = setTimeout(() => setLoadingProgress(0), 400);
      return () => clearTimeout(reset);
    }
    setLoadingProgress(0);
    const interval = setInterval(() => {
      setLoadingProgress((p) => (p >= 90 ? 90 : p + Math.max(1, (90 - p) * 0.1)));
    }, 150);
    return () => clearInterval(interval);
  }, [isPageLoading]);

  useEffect(() => {
    if (!isPageLoading) {
      setLoadMsgIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadMsgIndex((i) => (i + 1) % QUOTATION_LOADING_MESSAGES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [isPageLoading]);
  // const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const [selectedServiceId, setSelectedServiceId] =
    useState<string | null>(null);

  const [serviceProgress, setServiceProgress] = useState<
    Record<
      string,
      {
        generated: number;
        total: number;
        completed: boolean;
        next: number;
        canGenerate: boolean;
        reason: string | null;
        cooldownEndsAt?: number;
      }
    >
  >({});

  const [updatingStatus, setUpdatingStatus] = useState<null | 'sent'>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // IMPORTANT: don't rely on getQuotationById here — it's a closure
        // bound to the `quotations` array from the render that started this
        // effect, so calling it again after refreshQuotations() still checks
        // the SAME stale snapshot, no matter how many times we loop. Fetch
        // the quotation directly from the repo each attempt instead, which
        // is a fresh live call with no closure-staleness possible.
        const { getRepo } = await import('@/repo');
        const repo = getRepo();

        const MAX_ATTEMPTS = 6;
        const RETRY_DELAY_MS = 800;

        let direct: Awaited<ReturnType<typeof repo.getQuotation>> | null = null;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          if (cancelled) return;

          direct = await repo.getQuotation(id);
          if (direct) break;

          if (attempt < MAX_ATTEMPTS - 1) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          }
        }

        if (cancelled) return;

        if (direct) {
          // Keep context in sync now that we know the quotation exists,
          // so the rest of the page (invoices, service progress, etc.)
          // has fresh data too.
          refreshQuotations().catch(() => { });
          setQuotation({ ...direct, status: (direct.status || 'draft') as Quotation['status'] } as Quotation);
        } else {
          setQuotation(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!quotation) return;

    const services = getQuotationServiceBlocks(quotation);
    const map: typeof serviceProgress = {};

    for (const service of services) {
      const eligibility = getServiceInvoiceEligibility(
        quotation.id,
        service,
        invoices,
        invoiceItems
      );

      const serviceInvoiceCount = invoices.filter((inv) => {
        if (inv.quotation_id !== quotation.id) return false;
        return invoiceItems.some(
          (item) => item.invoice_id === inv.id && item.service_id === service.service_id
        );
      }).length;

      let total = 1;
      switch (service.billing_type) {
        case "monthly":
          total = Number(service.duration_months ?? 1);
          break;
        case "milestone":
          total = service.milestone_template?.length ?? 1;
          break;
        default:
          total = 1;
      }

      map[service.service_id] = {
        generated: serviceInvoiceCount,
        total,
        completed: eligibility.completed,
        next: serviceInvoiceCount + 1,
        canGenerate: eligibility.canGenerate,
        reason:
          eligibility.reason === "completed"
            ? "Completed"
            : eligibility.reason === "payment_pending"
              ? "Previous invoice must be paid first"
              : eligibility.reason === "cooldown"
                ? "cooldown" // marker only — actual display uses CountdownTimer
                : null,
        cooldownEndsAt: eligibility.cooldownEndsAt,
      };
    }

    setServiceProgress(map);
  }, [quotation, invoices, invoiceItems]);

  if (!id) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Invalid quotation.</p>
        <Button onClick={() => navigate("/quotations")}>Back</Button>
      </div>
    );
  }

  if (isPageLoading) {
    const circumference = 2 * Math.PI * 45;
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center relative overflow-hidden">
        <div
          className="absolute w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-pulse"
          style={{ animationDuration: "2.4s" }}
        />

        <div className="relative w-36 h-36 flex items-center justify-center" style={{ aspectRatio: "1 / 1" }}>
          <div
            className="absolute inset-0 rounded-full border-2 border-dashed border-primary/25 animate-spin"
            style={{ animationDuration: "6s" }}
          />

          <svg
            className="absolute -rotate-90"
            viewBox="0 0 100 100"
            style={{ width: "128px", height: "128px", aspectRatio: "1 / 1" }}
          >
            <defs>
              <linearGradient id="quotationLoaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="1" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-primary/10" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#quotationLoaderGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - loadingProgress / 100)}
              style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))" }}
            />
          </svg>

          <span className="relative font-heading font-bold text-3xl text-foreground tabular-nums transition-all duration-300">
            {Math.round(loadingProgress)}
            <span className="text-lg text-muted-foreground">%</span>
          </span>
        </div>

        <div className="mt-8 h-5 relative overflow-hidden">
          <p
            key={loadMsgIndex}
            className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {QUOTATION_LOADING_MESSAGES[loadMsgIndex]}
          </p>
        </div>

        <div className="flex gap-1.5 mt-4">
          {QUOTATION_LOADING_MESSAGES.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${i === loadMsgIndex ? "bg-primary" : "bg-primary/20"
                }`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Quotation not found.</p>
        <Button onClick={() => navigate("/quotations")}>Back</Button>
      </div>
    );
  }

  const safeTotals = getQuotationTotalsForDisplay(quotation);
  const serviceBlocks = getQuotationServiceBlocks(quotation);

  // Phase 4 (contracts) removed for now.
  // const linkedContract = undefined;
  // const linkedInvoices: never[] = [];
  // const advanceInvoice = undefined;
  // const finalInvoice = undefined;

  const subtotal = Number(safeTotals.subtotal || 0);
  const oneTime = Number(safeTotals.one_time_total || 0);
  const monthly = Number(safeTotals.monthly_total || 0);
  const tax = Number(quotation.tax_amount || 0);
  const discountAmount = Number(quotation.discount || 0);
  const total = Math.max(0, Number(safeTotals.total || 0) - discountAmount);

  return (
    <div className="quotation-preview-page" style={{ background: "#ffffff" }}>
      {/* Header (no-print) */}
      <div className="quotation-preview-actions no-print">
        <div className="flex items-center gap-4">
          <Link to="/quotations">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="quotation-preview-title">Quotation</h1>
            <p className="quotation-preview-subtitle mt-1">{quotation.quotation_number}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link to={`/quotation-builder?draftId=${quotation.id}`}>
            <Button variant="outline" className="rounded-xl" disabled={quotation.status !== 'draft'}>
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <GenerateInvoiceModal
        open={invoiceModalOpen}
        onOpenChange={(open) => {
          setInvoiceModalOpen(open);

          if (!open) {
            // Clear selected service when modal closes
            setSelectedServiceId(null);
          }
        }}
        quotation={quotation}
        selectedServiceId={selectedServiceId}
        // onGenerated={async (invoiceId) => {

        //   await refreshQuotations();
        //   await refreshInvoices();

        //   const updated =
        //     getQuotationById(quotation.id);

        //   if (updated) {

        //     setQuotation(updated);

        //     const services =
        //       getQuotationServiceBlocks(updated);

        //     const map: Record<string, any> = {};

        //     for (const service of services) {

        //       map[service.service_id] =
        //         await getServiceProgress(
        //           updated,
        //           service
        //         );

        //     }

        //     setServiceProgress(map);

        //   }

        //   setSelectedServiceId(null);

        //   navigate(`/invoices/${invoiceId}`);

        // }}

        onGenerated={async (invoiceId) => {

          await Promise.all([refreshQuotations(), refreshInvoices(), refreshInvoiceItems()]);

          setSelectedServiceId(null);

          navigate(`/invoices/${invoiceId}`);

        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 max-w-[1320px] mx-auto">
        {/* Left: Document (single source of truth for PDF) */}
        <div>
          <div>
            <ProfessionalQuotationLayout
              quotation={quotation}
              brandKit={brandKit}
            />
          </div>
        </div>

        {/* Right: Summary + Actions */}
        <aside className="no-print lg:sticky lg:top-6 h-fit">
          <div className="glass-card p-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Summary</p>
              <p className="font-heading font-bold text-xl text-foreground mt-1">{quotation.client?.business_name || quotation.client?.name || "Client"}</p>
              <p className="text-sm text-muted-foreground mt-1">{quotation.title || "Quotation"}</p>
            </div>

            <div className="border-t border-border/50 pt-4 space-y-2">
              {monthly > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly total</span>
                  <span className="text-foreground font-medium">{monthly.toLocaleString()}</span>
                </div>
              ) : null}
              {oneTime > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">One-time total</span>
                  <span className="text-foreground font-medium">{oneTime.toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground font-medium">{subtotal.toLocaleString()}</span>
                </div>
              )}
              {discountAmount > 0 ? (
                <div className="flex items-center justify-between text-sm text-red-600">
                  <span>Discount</span>
                  <span className="font-medium">-{discountAmount.toLocaleString()}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground font-medium">{tax.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="font-heading font-semibold text-foreground">Total</span>
                <span className="font-heading font-bold text-2xl text-foreground">{total.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              {quotation.status === 'accepted' || quotation.status === 'invoiced' ? (
                <Button
                  className="w-full gap-2 rounded-xl"
                  onClick={async () => {
                    if (!quotation) return;

                    try {
                      const blob = await pdf(
                        <ProfessionalQuotationPDF
                          quotation={quotation}
                          client={quotation.client}
                          brandKit={brandKit}
                        />
                      ).toBlob();

                      const url = URL.createObjectURL(blob);

                      const a = document.createElement("a");

                      const customer =
                        (quotation.client?.business_name ||
                          quotation.client?.name ||
                          "Client")
                          .replace(/[\\/:*?"<>|]/g, "")
                          .trim();

                      const quotationNo =
                        quotation.quotation_number?.startsWith("QT-")
                          ? quotation.quotation_number
                          : `QT-${quotation.quotation_number?.slice(-4) || quotation.id.slice(-4)}`;

                      const DOWNLOAD_COUNT_KEY = `qf_quotation_download_count_${quotation.id}`;
                      const previousCount = Number(localStorage.getItem(DOWNLOAD_COUNT_KEY) || "0");
                      localStorage.setItem(DOWNLOAD_COUNT_KEY, String(previousCount + 1));

                      const suffix = previousCount > 0 ? ` (${previousCount})` : "";

                      a.href = url;
                      a.download = `${customer} - ${quotationNo}${suffix}.pdf`;

                      document.body.appendChild(a);
                      a.click();

                      document.body.removeChild(a);

                      URL.revokeObjectURL(url);

                    } catch (err) {
                      console.error(err);
                    }
                  }}
                >
                  <Download className="w-4 h-4" /> Download PDF
                </Button>
              ) : null}

              {/* Actions by status (strict lifecycle) */}
              {quotation.status === 'draft' ? (
                <div className="rounded-xl border border-border/50 p-3 bg-secondary/30">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Actions</p>
                  <div className="mt-2 space-y-2">
                    <Button
                      className="w-full gap-2 rounded-xl"
                      disabled={updatingStatus !== null}
                      onClick={async () => {
                        setUpdatingStatus("sent");

                        try {
                          const now = new Date().toISOString();

                          const updated = {
                            ...quotation,
                            status: "sent" as const,
                            sent_at: now,
                          };

                          await updateQuotation(updated);

                          setQuotation(updated);

                          toast({
                            title: "Quotation Sent",
                            description: "Quotation marked as Sent.",
                          });

                        } catch (err) {
                          console.error(err);

                          toast({
                            title: "Error",
                            description: "Failed to send quotation.",
                            variant: "destructive",
                          });

                        } finally {
                          setUpdatingStatus(null);
                        }
                      }}
                    >
                      <Send className="w-4 h-4" />
                      Mark as Sent
                    </Button>


                    <Button
                      className="w-full gap-2 rounded-xl"
                      disabled={updatingStatus !== null}
                      onClick={async () => {
                        setUpdatingStatus('sent');
                        try {
                          const now = new Date().toISOString();
                          await updateQuotation({ ...quotation, status: 'sent', sent_at: now });
                          setQuotation({ ...quotation, status: 'sent', sent_at: now });

                          // const { encodeQuotationData } = await import('@/lib/shareLink');

                          // Prevent URL overflow from large base64 logos
                          // const safeBrandKit = brandKit ? {
                          //   ...brandKit,
                          //   logo_url: (brandKit.logo_url?.startsWith('data:') || brandKit.logo_url?.startsWith('blob:'))
                          //     ? null
                          //     : brandKit.logo_url
                          // } : null;

                          // const qData = {
                          //   v: 1,
                          //   quotation: { ...quotation, status: 'sent', sent_at: now, client: undefined } as Quotation,
                          //   client: quotation.client,
                          //   brandKit: safeBrandKit,
                          //   senderName: "Triple S Production"
                          // };

                          // const encoded = encodeQuotationData(qData);
                          const publicUrl =
                            `${window.location.origin}/public/quotation/${quotation.id}`;

                          const textArea = document.createElement("textarea");
                          textArea.value = publicUrl;
                          textArea.style.position = "fixed";
                          textArea.style.left = "-9999px";

                          document.body.appendChild(textArea);

                          textArea.focus();
                          textArea.select();

                          const copied = document.execCommand("copy");

                          document.body.removeChild(textArea);

                          if (copied) {
                            toast({
                              title: "Quotation marked as sent",
                              description: publicUrl,
                            });
                          } else {
                            window.prompt("Copy quotation link:", publicUrl);
                          }
                        } catch (err) {
                          console.error(err);
                          toast({ title: 'Error', description: 'Failed to share quotation', variant: 'destructive' });
                        } finally {
                          setUpdatingStatus(null);
                        }
                      }}
                    >
                      <Send className="w-4 h-4" /> Share Quotation Link
                    </Button>
                    <Link to={`/quotation-builder?draftId=${quotation.id}`}>
                      <Button variant="outline" className="w-full rounded-xl">Edit</Button>
                    </Link>
                  </div>
                </div>
              ) : null}

              {quotation.status === 'sent' ? (
                <div className="rounded-xl border border-border/50 p-3 bg-secondary/30">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
                  <p className="text-sm text-foreground mt-2">Waiting for acceptance</p>
                  <div className="mt-3 space-y-2">
                    <Button
                      variant="outline"
                      className="w-full gap-2 rounded-xl"
                      onClick={async () => {
                        const publicUrl =
                          `${window.location.origin}/public/quotation/${quotation.id}`;

                        try {

                          console.log("COPYING URL:", publicUrl);

                          if (navigator.clipboard?.writeText) {

                            await navigator.clipboard.writeText(publicUrl);

                          } else {

                            const textArea = document.createElement("textarea");
                            textArea.value = publicUrl;

                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand("copy");
                            document.body.removeChild(textArea);
                          }

                          console.log("COPY SUCCESS");

                          toast({
                            title: "Quotation marked as sent",
                            description: publicUrl,
                          });

                        } catch (err) {

                          console.error("COPY FAILED", err);

                          toast({
                            title: "Copy failed",
                            description: publicUrl,
                            variant: "destructive",
                          });

                        }
                      }}
                    >
                      <Send className="w-4 h-4" /> Share Quotation Link
                    </Button>
                  </div>
                </div>
              ) : null}

              {quotation.status === "accepted" && (

                <div className="rounded-xl border border-border/50 p-3 bg-secondary/30">

                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Invoice Generation
                  </p>

                  <div className="space-y-3 mt-3">

                    {serviceBlocks.map((service) => {
                      const progress =
                        serviceProgress[service.service_id] ?? {
                          generated: 0,
                          total:
                            service.billing_type === "monthly"
                              ? Number(service.duration_months ?? 1)
                              : service.billing_type === "milestone"
                                ? service.milestone_template?.length ?? 1
                                : 1,
                          completed: false,
                          next: 1,
                          canGenerate: true,
                          reason: null,
                          cooldownEndsAt: undefined,
                        };

                      const isCooldown = progress.reason === "cooldown" && !!progress.cooldownEndsAt;

                      let buttonLabel: React.ReactNode = "Generate Invoice";

                      switch (service.billing_type) {
                        case "monthly":
                          if (progress.completed) {
                            buttonLabel = "Completed";
                          } else if (isCooldown) {
                            buttonLabel = (
                              <CountdownTimer
                                endsAt={progress.cooldownEndsAt!}
                                prefix="Available in"
                                className="tabular-nums"
                              />
                            );
                          } else {
                            buttonLabel = `Generate Month ${progress.next}`;
                          }
                          break;

                        case "milestone":
                          buttonLabel = progress.completed
                            ? "Completed"
                            : `Generate Milestone ${progress.next}`;
                          break;

                        case "one_time":
                        default:
                          buttonLabel = progress.completed ? "Completed" : "Generate Invoice";
                      }

                      return (
                        <div key={service.service_id} className="rounded-lg border p-3">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-semibold">{service.service_name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {service.billing_type}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {Math.min(progress.generated, progress.total)} / {progress.total}
                              </p>
                            </div>
                          </div>

                          <Button
                            className="w-full mt-3"
                            disabled={!progress.canGenerate}
                            onClick={() => {
                              if (!progress.canGenerate) return;
                              setSelectedServiceId(service.service_id);
                              setInvoiceModalOpen(true);
                            }}
                          >
                            {progress.completed ? "Completed" : buttonLabel}
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                </div>

              )}

              {quotation.status === 'invoiced' ? (
                <div className="rounded-xl border border-border/50 p-3 bg-secondary/30">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
                  <p className="text-sm text-foreground mt-2">Invoiced</p>
                  <div className="mt-3 space-y-2">
                    {(() => {
                      const inv = invoices
                        .filter((i) => i.quotation_id === quotation.id)
                        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
                      if (!inv) return null;
                      return (
                        <Link to={`/invoices/${inv.id}`}>
                          <Button variant="outline" className="w-full rounded-xl">View Invoice</Button>
                        </Link>
                      );
                    })()}
                    <Button variant="outline" className="w-full rounded-xl" disabled>
                      View Payments
                    </Button>
                  </div>
                </div>
              ) : null}

            </div>

            <div className="border-t border-border/50 pt-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Lifecycle</p>
              <p className="text-sm text-foreground">{quotation.status.toUpperCase()}</p>
              {/* <p className="text-xs text-muted-foreground">Draft → Sent → Accepted → Invoiced</p> */}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// export async function updateQuotationStatusIfCompleted(

//   quotation: Quotation

// ) {

//   const services =

//     getQuotationServiceBlocks(quotation);

//   for (const service of services) {

//     const progress =

//       await getServiceProgress(

//         quotation,

//         service

//       );

//     if (!progress.completed) {

//       return;

//     }

//   }

//   const repo = getRepo();

//   await repo.updateQuotation({

//     ...quotation,

//     status: "invoiced",

//     invoiced_at: nowIso(),

//   });

// }