//GenerateInvoiceModal

import type { Quotation } from "@/lib/types";
import type { GenerateInvoicePlan, ServiceInvoiceEligibility } from "@/lib/phase4Invoicing";
import { getServiceInvoiceEligibility } from "@/lib/phase4Invoicing";
import { getRepo } from '@/repo';
import { getQuotationServiceBlocks } from "@/lib/quotationServiceBlocks";
import { useApp } from "@/contexts/AppContext";
import { useEffect, useMemo, useState } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ReceiptText, Lock, CheckCircle2 } from 'lucide-react';
import InvoiceServiceSelector from "./InvoiceServiceSelector"; ``



type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation;
  selectedServiceId?: string | null;
  onGenerated: (invoiceId: string) => void | Promise<void>;
};

type Mode = 'full' | 'partial' | 'milestone' | 'monthly';

const INVOICE_LOADING_MESSAGES = [
  "Creating your invoice...",
  "Adding line items...",
  "Calculating totals...",
  "Almost there...",
];

export function GenerateInvoiceModal({
  open,
  onOpenChange,
  quotation,
  selectedServiceId,
  onGenerated,
}: Props) {
  if (open) console.log(`[TIMING] GenerateInvoiceModal render start: ${performance.now().toFixed(1)}ms`);
  const [mode, setMode] = useState<Mode>('full');
  const [generating, setGenerating] = useState(false);
  const [genMessageIndex, setGenMessageIndex] = useState(0);
  const [genProgress, setGenProgress] = useState(0);
  const [partialRaw, setPartialRaw] = useState('50%');
  const [monthlyAmountRaw, setMonthlyAmountRaw] = useState('');
  const [totalMonths, setTotalMonths] = useState('1');
  const [milestones, setMilestones] = useState<Array<{ label: string; amount: string }>>([
    { label: 'Milestone 1', amount: '' },
    { label: 'Milestone 2', amount: '' },
  ]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!generating) {
      setGenMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setGenMessageIndex((i) => (i + 1) % INVOICE_LOADING_MESSAGES.length);
    }, 1300);
    return () => clearInterval(interval);
  }, [generating]);

  // Simulated progress: keeps crawling toward 99% for as long as generation
  // takes — never hard-caps and waits, so it never visibly "freezes" even if
  // the real work runs longer than expected. Only reaches 100% on completion.
  useEffect(() => {
    if (!generating) {
      setGenProgress(0);
      return;
    }
    setGenProgress(0);
    const interval = setInterval(() => {
      setGenProgress((p) => {
        if (p >= 99) return 99;
        // Step size shrinks as we approach 99, but never hits exactly 0 —
        // always at least a fraction of a percent of visible movement.
        const remaining = 99 - p;
        const step = Math.max(0.15, remaining * 0.04);
        return Math.min(99, p + step);
      });
    }, 150);
    return () => clearInterval(interval);
  }, [generating]);


  // Service Navigator
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);

  const [step, setStep] = useState<"services" | "invoice">("services");

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const { invoices, invoiceItems } = useApp();

  const getGeneratedCountForService = (serviceId: string) =>
    invoices.filter((inv) => {
      if (inv.quotation_id !== quotation.id) return false;
      return invoiceItems.some((item) => item.invoice_id === inv.id && item.service_id === serviceId);
    }).length;

  const serviceBlocks =
    getQuotationServiceBlocks(quotation);

  const eligibilityMap = useMemo(() => {
    const t0 = performance.now();
    const map: Record<string, ServiceInvoiceEligibility> = {};
    for (const s of serviceBlocks) {
      map[s.service_id] = getServiceInvoiceEligibility(quotation.id, s, invoices, invoiceItems);
    }
    console.log(`[TIMING] eligibilityMap computed in ${(performance.now() - t0).toFixed(1)}ms | invoices=${invoices.length} items=${invoiceItems.length}`);
    return map;
  }, [serviceBlocks, quotation.id, invoices, invoiceItems]);

  const filteredServiceBlocks =
    selectedServiceIds.length === 0
      ? serviceBlocks
      : serviceBlocks.filter((service) =>
        selectedServiceIds.includes(service.service_id)
      );

  const currentService =
    filteredServiceBlocks[currentServiceIndex] ?? null;


  useEffect(() => {
    if (!currentService) return;

    switch (currentService.billing_type) {
      case "milestone":
        setMode("milestone");
        break;

      case "monthly":
        setMode("monthly");
        break;

      case "retainer":
        setMode("monthly");
        break;

      default:
        setMode("full");
        break;
    }
  }, [currentService]);

  const currentMilestones = useMemo(() => {
    if (!currentService) return [];

    return currentService.milestone_template ?? [];
  }, [currentService]);

  const total = useMemo(() => {

    return filteredServiceBlocks.reduce(

      (sum, service) =>

        sum + Number(service.price || 0),

      0

    );

  }, [filteredServiceBlocks]);

  // ===== PASTE BELOW THIS =====

  // const milestonePlans = useMemo(() => {
  //   return (quotation.service_blocks ?? [])
  //     .filter((block) => block.billing_type === "milestone")
  //     .flatMap((block) => block.milestone_template ?? []);
  // }, [quotation]);

  // const monthlyPlans = useMemo(() => {
  //   return (quotation.service_blocks ?? [])
  //     .filter((block) => block.billing_type === "monthly");
  // }, [quotation]);

  // ===== END PASTE =====

  const partialAmount = useMemo(() => {
    const t = total;
    const raw = partialRaw.trim();
    if (!raw) return 0;
    if (raw.endsWith('%')) {
      const pct = Number(raw.replace('%', '').trim());
      if (!Number.isFinite(pct)) return 0;
      return Math.round((t * Math.max(0, Math.min(100, pct))) / 100);
    }
    const amt = Number(raw);
    return Number.isFinite(amt) ? Math.max(0, Math.min(t, amt)) : 0;
  }, [partialRaw, total]);

  const balance = Math.max(0, total - partialAmount);

  return (
    <Dialog open={open} onOpenChange={generating ? undefined : onOpenChange}>
      <DialogContent className="p-6 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto scrollbar-modern">
        {generating ? (() => {
          const circumference = 2 * Math.PI * 45;
          return (
            <div className="flex flex-col items-center justify-center py-16 relative overflow-hidden">
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
                    <linearGradient id="invoiceLoaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
                    stroke="url(#invoiceLoaderGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - genProgress / 100)}
                    style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))" }}
                  />
                </svg>

                <span className="relative font-heading font-bold text-3xl text-foreground tabular-nums transition-all duration-300">
                  {Math.round(genProgress)}
                  <span className="text-lg text-muted-foreground">%</span>
                </span>
              </div>

              <div className="mt-8 h-5 relative overflow-hidden">
                <p
                  key={genMessageIndex}
                  className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500"
                >
                  {INVOICE_LOADING_MESSAGES[genMessageIndex]}
                </p>
              </div>

              <div className="flex gap-1.5 mt-4">
                {INVOICE_LOADING_MESSAGES.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${i === genMessageIndex ? "bg-primary" : "bg-primary/20"
                      }`}
                  />
                ))}
              </div>
            </div>
          );
        })() : (
          <>
            <DialogHeader>
              <DialogTitle>Generate Invoice</DialogTitle>
              <DialogDescription>Select how you want to invoice this quotation.</DialogDescription>
            </DialogHeader>

            {step === "services" ? (

              <InvoiceServiceSelector
                serviceBlocks={serviceBlocks}
                selectedIds={selectedServiceIds}
                onSelectionChange={setSelectedServiceIds}
                eligibilityMap={eligibilityMap}
              />

            ) : (

              <div className="space-y-4">
                <RadioGroup
                  value={mode}
                  disabled
                  className="opacity-60 pointer-events-none"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="inv-full" />
                    <Label htmlFor="inv-full">Full Payment</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="partial" id="inv-partial" />
                    <Label htmlFor="inv-partial">Partial Payment</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="milestone" id="inv-milestone" />
                    <Label htmlFor="inv-milestone">Milestone Based</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="inv-monthly" />
                    <Label htmlFor="inv-monthly">Monthly Payment</Label>
                  </div>
                </RadioGroup>

                {currentService && (
                  <Card className="p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-4">

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentServiceIndex === 0}
                        onClick={() =>
                          setCurrentServiceIndex((i) => Math.max(0, i - 1))
                        }
                      >
                        ←
                      </Button>

                      <div className="text-center flex-1">
                        <h3 className="font-semibold text-lg">
                          {currentService.service_name}
                        </h3>

                        <p className="text-sm text-muted-foreground">
                          Service {currentServiceIndex + 1} of {filteredServiceBlocks.length}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentServiceIndex === filteredServiceBlocks.length - 1}
                        onClick={() =>
                          setCurrentServiceIndex((i) =>
                            Math.min(filteredServiceBlocks.length - 1, i + 1)
                          )
                        }
                      >
                        →
                      </Button>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Billing Type
                      </span>

                      <span className="font-medium capitalize">
                        {currentService.billing_type?.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex justify-between mt-2">
                      <span className="text-muted-foreground">
                        Project Value
                      </span>

                      <span className="font-bold">
                        ₹{Number(currentService.price).toLocaleString()}
                      </span>
                    </div>
                  </Card>
                )}

                <div className="space-y-4">

                  <Card className="p-4 rounded-xl">

                    <div className="flex items-center justify-between">

                      <div>

                        <h3 className="font-semibold text-lg">
                          Selected Services
                        </h3>

                        <p className="text-sm text-muted-foreground">
                          {filteredServiceBlocks.length} service(s) selected
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-sm text-muted-foreground">
                          Total Project Value
                        </p>

                        <p className="font-bold text-xl">
                          ₹{total.toLocaleString()}
                        </p>

                      </div>

                    </div>

                  </Card>

                  {filteredServiceBlocks.map((service) => (

                    <Card
                      key={service.service_id}
                      className="p-5 rounded-xl space-y-4"
                    >

                      <div className="flex items-center justify-between">

                        <div>

                          <h3 className="font-semibold text-lg">
                            {service.service_name}
                          </h3>

                          <p className="text-sm text-muted-foreground capitalize">
                            {service.billing_type?.replace("_", " ")}
                          </p>

                        </div>

                        <div className="font-bold text-lg">
                          ₹{Number(service.price).toLocaleString()}
                        </div>

                      </div>

                      {/* ---------------- ONE TIME ---------------- */}

                      {service.billing_type === "one_time" && (

                        <div className="border rounded-xl p-4 flex justify-between">

                          <span>Amount</span>

                          <span className="font-semibold">
                            ₹{Number(service.price).toLocaleString()}
                          </span>

                        </div>

                      )}

                      {/* ---------------- MILESTONE ---------------- */}

                      {service.billing_type === "milestone" && (() => {
                        const generatedCount = getGeneratedCountForService(service.service_id);
                        const template = service.milestone_template ?? [];
                        const nextLabel = template[generatedCount]?.label ?? null;

                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                Milestone Payment Plan
                              </p>
                              {nextLabel ? (
                                <p className="text-xs font-semibold text-foreground">
                                  Invoicing now: {nextLabel}
                                </p>
                              ) : (
                                <p className="text-xs font-semibold text-muted-foreground">
                                  All milestones invoiced
                                </p>
                              )}
                            </div>

                            <div className="space-y-3">
                              {template.map((milestone, index) => {
                                const isInvoiced = index < generatedCount;
                                const isNext = index === generatedCount;

                                return (
                                  <div
                                    key={milestone.id ?? index}
                                    className={`grid grid-cols-[24px_1fr_90px_130px] gap-3 items-center border rounded-xl px-4 py-3 ${isInvoiced
                                      ? "bg-muted/40 border-border/50 opacity-70"
                                      : isNext
                                        ? "border-black ring-1 ring-black"
                                        : "border-border/50"
                                      }`}
                                  >
                                    <div className="flex items-center justify-center">
                                      {isInvoiced ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                      ) : isNext ? null : (
                                        <Lock className="w-4 h-4 text-muted-foreground" />
                                      )}
                                    </div>

                                    <div>
                                      <p className="font-medium">
                                        {milestone.label}
                                      </p>
                                      {isInvoiced ? (
                                        <p className="text-xs text-muted-foreground">Already invoiced</p>
                                      ) : isNext ? (
                                        <p className="text-xs font-semibold text-foreground">Invoicing now</p>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">Not yet available</p>
                                      )}
                                    </div>

                                    <div className="text-center">
                                      {milestone.percentage}%
                                    </div>

                                    <div className="text-right font-semibold">
                                      ₹{Number(milestone.amount).toLocaleString()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}

                      {/* ---------------- MONTHLY ---------------- */}

                      {service.billing_type === "monthly" && (

                        <div className="space-y-3">

                          <div className="border rounded-xl p-4 flex justify-between">

                            <span>Monthly Amount</span>

                            <span className="font-semibold">
                              ₹{Number(service.monthly_amount ?? 0).toLocaleString()}
                            </span>

                          </div>

                          <div className="border rounded-xl p-4 flex justify-between">

                            <span>Duration</span>

                            <span>
                              {service.duration_months} Months
                            </span>

                          </div>

                          <div className="border rounded-xl p-4 flex justify-between">

                            <span>Total Contract</span>

                            <span className="font-semibold">
                              ₹{Number(service.price).toLocaleString()}
                            </span>

                          </div>

                        </div>

                      )}

                    </Card>

                  ))}

                </div>
              </div>
            )}

            <DialogFooter>

              {step === "services" ? (

                <>
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>

                  <Button
                    disabled={selectedServiceIds.length === 0}
                    onClick={() => {
                      setCurrentServiceIndex(0);
                      setStep("invoice");
                    }}
                  >
                    Continue
                  </Button>
                </>

              ) : (

                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep("services");
                    }}
                  >
                    Back
                  </Button>

                  <Button
                    className="rounded-xl"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setGenerating(true);

                      try {
                        const { generateInvoiceForQuotationPlan } =
                          await import("@/lib/phase4Invoicing");

                        const repo = getRepo();

                        const freshQuotation =
                          await repo.getQuotation(quotation.id);

                        const quotationToUse =
                          freshQuotation ?? quotation;

                        const selectedBlocks =
                          filteredServiceBlocks;

                        const hasMilestone =
                          selectedBlocks.some(
                            s => s.billing_type === "milestone"
                          );

                        const hasMonthly =
                          selectedBlocks.some(
                            s => s.billing_type === "monthly"
                          );

                        let plan: any;

                        if (mode === "partial") {

                          plan = {
                            type: "partial",
                            amount: partialAmount,
                            selectedServiceIds,
                          };

                        }

                        else if (hasMilestone) {

                          plan = {

                            type: "milestone",

                            milestones:
                              currentMilestones.map((m) => ({

                                label: m.label,

                                amount: m.amount,

                                status: "pending" as const,

                              })),

                            selectedServiceIds,

                          };

                        }

                        else if (hasMonthly) {

                          const firstMonthly =
                            selectedBlocks.find(
                              s => s.billing_type === "monthly"
                            );

                          plan = {

                            type: "monthly",

                            monthlyAmount:
                              Number(firstMonthly?.monthly_amount ?? 0),

                            totalMonths:
                              Number(firstMonthly?.duration_months ?? 1),

                            selectedServiceIds,

                          };

                        }

                        else {

                          plan = {

                            type: "full",

                            selectedServiceIds,

                          };

                        }

                        const invoiceId =
                          await generateInvoiceForQuotationPlan(

                            quotationToUse,

                            plan

                          );

                        // Wait for onGenerated (refresh + navigate) to fully complete
                        // before closing the modal — otherwise the underlying page
                        // flashes for a moment between modal-close and navigation.
                        await onGenerated(invoiceId);
                        onOpenChange(false);
                      } finally {
                        setBusy(false);
                        setGenerating(false);
                      }
                    }}
                  >
                    {mode === "full"
                      ? "Generate Invoice"
                      : mode === "partial"
                        ? "Generate Advance Invoice"
                        : mode === "monthly"
                          ? "Generate First Month Invoice"
                          : (() => {
                            const milestoneService = filteredServiceBlocks.find((s) => s.billing_type === "milestone");
                            if (!milestoneService) return "Generate Milestone Invoice";
                            const count = getGeneratedCountForService(milestoneService.service_id);
                            const label = milestoneService.milestone_template?.[count]?.label;
                            return label ? `Generate Invoice — ${label}` : "Generate Milestone Invoice";
                          })()}
                  </Button>
                </>

              )}

            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}