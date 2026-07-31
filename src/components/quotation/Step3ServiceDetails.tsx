import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { RichEditor } from "@/components/ui/RichText";

import {
    Package,
    Clock,
    FileText,
    ListChecks,
    ScrollText,
    Wallet,
    ChevronRight,
} from "lucide-react";

import type { QuotationServiceBlock } from "@/lib/quotationServiceBlocks";

type Step3ServiceDetailsProps = {
    serviceBlocks: QuotationServiceBlock[];

    updateBlock: (
        index: number,
        patch: Partial<QuotationServiceBlock>
    ) => void;

    goBack: () => void;
};

export default function Step3ServiceDetails({
    serviceBlocks,
    updateBlock,
    goBack,
}: Step3ServiceDetailsProps) {
    return (
        <>
            <div className="space-y-8 min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold mb-1">Step 3</p>
                <h2 className="text-2xl font-heading font-bold text-foreground">Service Details</h2>
                <p className="text-sm text-muted-foreground mt-1">Define scope, deliverables, and terms for each service.</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-3xl font-heading font-bold text-foreground leading-none">
                  {serviceBlocks.length}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {serviceBlocks.length === 1 ? "Service" : "Services"}
                </span>
              </div>
            </div>

            {serviceBlocks.length === 0 ? (
              <Card className="border-2 border-dashed border-foreground/40 rounded-2xl bg-transparent shadow-none">
                <CardContent className="py-14 text-center">
                  <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" strokeWidth={1.5} />
                  <p className="text-muted-foreground mb-1">No services selected yet</p>
                  <Button variant="link" onClick={goBack} className="text-foreground font-semibold gap-1">
                    Back to Services <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              serviceBlocks.map((b, idx) => (

                <Card
                  key={`${b.service_id}-${idx}`}
                  className="relative rounded-2xl border border-border/60 shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                  {/* Thick left accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-foreground" />

                  <CardHeader className="pl-6 sm:pl-8 pb-5 border-b border-border/50 shrink-0">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-baseline gap-4 min-w-0">
                        <span className="font-heading text-4xl font-bold text-foreground/10 leading-none select-none shrink-0">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <CardTitle className="text-xl font-heading font-bold text-foreground leading-tight truncate">
                          {b.service_name || "Service"}
                        </CardTitle>
                      </div>

                      {/* Timeline tucked in the corner */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                          <span className="text-[10px] uppercase tracking-wide font-bold">Timeline</span>
                        </div>
                        <Input
                          value={b.timeline || ""}
                          onChange={(e) => updateBlock(idx, { timeline: e.target.value })}
                          className="rounded-xl border-border/70 h-[34px] w-[120px] text-sm text-right"
                          placeholder="e.g., 2 weeks"
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pl-6 sm:pl-8 space-y-7 pt-6">

                    {/* Row 1: Description / Scope of Work / Deliverables — 3 square boxes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-foreground" strokeWidth={2.5} />
                          <Label className="text-xs uppercase tracking-wide text-foreground font-bold">
                            Description
                          </Label>
                        </div>
                        <RichEditor
                          value={b.description || ""}
                          onChange={(val) => updateBlock(idx, { description: val })}
                          className="h-[140px] rounded-xl border border-border/70"
                          placeholder="Service description..."
                        />
                      </div>

                      <div className="space-y-2.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <ListChecks className="w-3.5 h-3.5 text-foreground" strokeWidth={2.5} />
                          <Label className="text-xs uppercase tracking-wide text-foreground font-bold">
                            Scope of Work
                          </Label>
                        </div>
                        <RichEditor
                          value={b.scope_of_work || ""}
                          onChange={(val) => updateBlock(idx, { scope_of_work: val })}
                          className="h-[140px] rounded-xl border border-border/70"
                          placeholder="Write scope of work for this service..."
                        />
                      </div>

                      <div className="space-y-2.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.5} />
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground font-bold">
                            Deliverables <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
                          </Label>
                        </div>
                        <RichEditor
                          value={b.deliverables || ""}
                          onChange={(val) => updateBlock(idx, { deliverables: val })}
                          className="h-[140px] rounded-xl border border-border/70"
                          placeholder="Optional deliverables for this service..."
                        />
                      </div>
                    </div>

                    {/* Terms section, visually separated */}
                    <div className="relative pt-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="h-px flex-1 bg-border/60" />
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground text-background shrink-0">
                          <ScrollText className="w-3 h-3" strokeWidth={2.5} />
                          <span className="text-[10px] uppercase tracking-wide font-bold whitespace-nowrap">Terms & Conditions</span>
                        </div>
                        <div className="h-px flex-1 bg-border/60" />
                      </div>

                      {/* Row 2: Payment Terms / Service Terms / Terms & Conditions — 3 square boxes */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-2.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.5} />
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-bold">
                              Payment Terms <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
                            </Label>
                          </div>
                          <RichEditor
                            value={b.payment_terms || ""}
                            onChange={(val) => updateBlock(idx, { payment_terms: val })}
                            className="h-[160px] rounded-xl border border-border/70"
                            placeholder="Optional payment terms..."
                          />
                        </div>

                        <div className="space-y-2.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <ScrollText className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.5} />
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-bold">
                              Service Terms <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
                            </Label>
                          </div>
                          <RichEditor
                            value={b.service_terms || ""}
                            onChange={(val) => updateBlock(idx, { service_terms: val })}
                            className="h-[160px] rounded-xl border border-border/70"
                            placeholder="Optional terms..."
                          />
                        </div>

                        <div className="space-y-2.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <ScrollText className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.5} />
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-bold">
                              Terms & Conditions
                            </Label>
                          </div>
                          <RichEditor
                            value={b.terms_conditions_text || ""}
                            onChange={(val) => updateBlock(idx, { terms_conditions_text: val })}
                            className="h-[160px] rounded-xl border border-border/70 border-black"
                            placeholder="Terms & conditions specific to this service..."
                          />
                        </div>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
    );
}