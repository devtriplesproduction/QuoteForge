import { useState } from "react";

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
    ChevronDown,
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

    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const [showTerms, setShowTerms] = useState<Record<number, boolean>>({});
    return (
        <>
            <div className="space-y-6 min-w-0">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold mb-1">Step 3</p>
                        <h2 className="text-2xl font-heading font-bold text-foreground">Service Details</h2>
                        <p className="text-sm text-muted-foreground mt-1">Define scope, deliverables, and terms for each service.</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-2xl font-heading font-bold text-foreground leading-none">
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
                    serviceBlocks.map((b, idx) => {
                        const isOpen = openIndex === idx;
                        const termsVisible = Boolean(showTerms[idx]);

                        return (
                            <Card
                                key={`${b.service_id}-${idx}`}
                                className="rounded-2xl border border-border/60 shadow-sm overflow-hidden"
                            >
                                {/* Header — always visible, click to expand/collapse */}
                                <button
                                    type="button"
                                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-secondary/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-foreground text-background text-xs font-bold shrink-0">
                                            {idx + 1}
                                        </span>
                                        <span className="font-heading font-semibold text-foreground truncate">
                                            {b.service_name || "Service"}
                                        </span>
                                        {b.timeline && (
                                            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                                <Clock className="w-3 h-3" />
                                                {b.timeline}
                                            </span>
                                        )}
                                    </div>
                                    <ChevronDown
                                        className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                                    />
                                </button>

                                {isOpen && (
                                    <CardContent className="px-5 sm:px-6 pb-6 pt-2 space-y-6 border-t border-border/50">

                                        {/* Timeline input, tucked above the core fields */}
                                        <div className="flex items-center gap-2 pt-4">
                                            <Clock className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.5} />
                                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-bold shrink-0">
                                                Timeline
                                            </Label>
                                            <Input
                                                value={b.timeline || ""}
                                                onChange={(e) => updateBlock(idx, { timeline: e.target.value })}
                                                className="rounded-xl border-border/70 h-9 max-w-[160px] text-sm"
                                                placeholder="e.g., 2 weeks"
                                            />
                                        </div>

                                        {/* Core fields */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-3.5 h-3.5 text-foreground" strokeWidth={2.5} />
                                                    <Label className="text-xs uppercase tracking-wide text-foreground font-bold">
                                                        Description
                                                    </Label>
                                                </div>
                                                <RichEditor
                                                    value={b.description || ""}
                                                    onChange={(val) => updateBlock(idx, { description: val })}
                                                    className="min-h-[110px] max-h-[320px] overflow-y-auto rounded-xl border border-border/70"
                                                    placeholder="Service description..."
                                                />
                                            </div>

                                            <div className="space-y-2 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <ListChecks className="w-3.5 h-3.5 text-foreground" strokeWidth={2.5} />
                                                    <Label className="text-xs uppercase tracking-wide text-foreground font-bold">
                                                        Scope of Work
                                                    </Label>
                                                </div>
                                                <RichEditor
                                                    value={b.scope_of_work || ""}
                                                    onChange={(val) => updateBlock(idx, { scope_of_work: val })}
                                                    className="min-h-[110px] max-h-[320px] overflow-y-auto rounded-xl border border-border/70"
                                                    placeholder="Write scope of work for this service..."
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.5} />
                                                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-bold">
                                                    Deliverables <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
                                                </Label>
                                            </div>
                                            <RichEditor
                                                value={b.deliverables || ""}
                                                onChange={(val) => updateBlock(idx, { deliverables: val })}
                                                className="min-h-[90px] max-h-[280px] overflow-y-auto rounded-xl border border-border/70"
                                                placeholder="Optional deliverables for this service..."
                                            />
                                        </div>

                                        {/* Terms — hidden behind a toggle, since these are mostly reused boilerplate */}
                                        <div className="pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowTerms((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                                                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <ScrollText className="w-3.5 h-3.5" strokeWidth={2.5} />
                                                {termsVisible ? "Hide" : "Show"} payment & terms
                                                <ChevronDown
                                                    className={`w-3.5 h-3.5 transition-transform duration-200 ${termsVisible ? "rotate-180" : ""}`}
                                                />
                                            </button>

                                            {termsVisible && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
                                                    <div className="space-y-2 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Wallet className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.5} />
                                                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-bold">
                                                                Payment Terms <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
                                                            </Label>
                                                        </div>
                                                        <RichEditor
                                                            value={b.payment_terms || ""}
                                                            onChange={(val) => updateBlock(idx, { payment_terms: val })}
                                                            className="min-h-[160px] max-h-[400px] overflow-y-auto rounded-xl border border-border/70"
                                                            placeholder="Optional payment terms..."
                                                        />
                                                    </div>

                                                    <div className="space-y-2 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <ScrollText className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.5} />
                                                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-bold">
                                                                Service Terms <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
                                                            </Label>
                                                        </div>
                                                        <RichEditor
                                                            value={b.service_terms || ""}
                                                            onChange={(val) => updateBlock(idx, { service_terms: val })}
                                                            className="min-h-[160px] max-h-[400px] overflow-y-auto rounded-xl border border-border/70"
                                                            placeholder="Optional terms..."
                                                        />
                                                    </div>

                                                    <div className="space-y-2 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <ScrollText className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.5} />
                                                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-bold">
                                                                Terms & Conditions
                                                            </Label>
                                                        </div>
                                                        <RichEditor
                                                            value={b.terms_conditions_text || ""}
                                                            onChange={(val) => updateBlock(idx, { terms_conditions_text: val })}
                                                            className="min-h-[160px] max-h-[400px] overflow-y-auto rounded-xl border border-border/70"
                                                            placeholder="Terms & conditions specific to this service..."
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                    </CardContent>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>
        </>
    );
}