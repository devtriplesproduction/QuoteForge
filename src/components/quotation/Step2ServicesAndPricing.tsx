import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/pages/DatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import ServiceConfigurator from "@/components/service-configurator/ServiceConfigurator";
import { calculateMonthly } from "@/components/quotation/pricing";
import { getServiceConfig } from "@/lib/service-configs";

import {
    generateMilestones,
    updateMilestonePercentage,
    calculateMilestoneTotal,
    calculateRemainingPercentage,
    updateMilestoneLabel,
    calculateTotalPercentage,
    createMilestone,
} from "@/components/quotation/milestoneCal";

import type { ServiceConfigState } from "@/lib/pricing-engine";

import type {
    QuotationServiceBlock,
    QuotationServiceBlockBillingType,
} from "@/lib/quotationServiceBlocks";

import {
    FileText,
    Users,
    Calendar as CalendarIcon,
    Clock,
    UserPlus,
    Tag,
    ChevronDown,
    Wallet,
    X,
} from "lucide-react";

type Step2ServicesAndPricingProps = {

    services: any[];

    categoriesInUse: string[];

    categoryChipFilter: string;
    setCategoryChipFilter: (value: string) => void;

    showAllCategoryChips: boolean;
    setShowAllCategoryChips:
    React.Dispatch<React.SetStateAction<boolean>>;

    groupedFilteredServices: Record<string, any[]>;

    openCategories: Set<string>;
    toggleCategory: (category: string) => void;

    serviceBlocks: any[];

    addOrRemoveServiceAsBlock: (
        serviceId: string,
        checked: boolean
    ) => void;

    updateBlock: (
        idx: number,
        patch: any
    ) => void;

    rightColumnRef: React.RefObject<HTMLDivElement>;

    rightColumnHeight: number | null;

    currency: any;

    derivedTotals: any;

    discountAmount: number;

    finalTotal: number;

    serviceSearch: string;
};

export default function Step2ServicesAndPricing(
    props: Step2ServicesAndPricingProps
) {

    const {
        services,
        categoriesInUse,
        categoryChipFilter,
        setCategoryChipFilter,
        showAllCategoryChips,
        setShowAllCategoryChips,
        groupedFilteredServices,
        openCategories,
        toggleCategory,
        serviceBlocks,
        addOrRemoveServiceAsBlock,
        updateBlock,
        rightColumnRef,
        rightColumnHeight,
        currency,
        derivedTotals,
        discountAmount,
        finalTotal,
        serviceSearch,
    } = props;

    return (
        <>
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_clamp(320px,36vw,480px)] gap-6">

                {/* Left */}
                <div className="space-y-6 min-w-0">
                    <Card className="relative rounded-2xl border border-border/60 shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                        {/* Thick left accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-foreground" />

                        <CardHeader className="pl-6 sm:pl-8 pb-5 border-b border-border/50">
                            <div className="flex items-baseline gap-4 mb-4">
                                <span className="font-heading text-4xl font-bold text-foreground/10 leading-none select-none">
                                    02
                                </span>
                                <CardTitle className="text-xl font-heading font-bold text-foreground leading-tight">
                                    Services Selection
                                </CardTitle>
                            </div>

                            <div
                                className={`flex flex-wrap gap-2 overflow-hidden transition-[max-height] duration-300 ${showAllCategoryChips ? "max-h-[500px]" : "max-h-[76px]"
                                    }`}
                            >
                                <Button
                                    type="button"
                                    variant={categoryChipFilter === "all" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCategoryChipFilter("all")}
                                    className={`rounded-full h-8 px-3 shrink-0 ${categoryChipFilter === "all" ? "bg-[#111111] text-white hover:bg-black/80" : ""
                                        }`}
                                >
                                    All
                                </Button>
                                {categoriesInUse.map((cat) => (
                                    <Button
                                        key={cat}
                                        type="button"
                                        variant={categoryChipFilter === cat ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCategoryChipFilter(categoryChipFilter === cat ? "all" : cat)}
                                        className={`rounded-full h-8 px-3 shrink-0 whitespace-nowrap ${categoryChipFilter === cat ? "bg-[#111111] text-white hover:bg-black/80" : ""
                                            }`}
                                    >
                                        {cat}
                                    </Button>
                                ))}
                            </div>

                            {categoriesInUse.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowAllCategoryChips((v) => !v)}
                                    className="mt-2 text-xs font-semibold text-accent hover:underline"
                                >
                                    {showAllCategoryChips ? "Show less" : "Show more"}
                                </button>
                            )}
                        </CardHeader>
                        <CardContent className="pl-6 sm:pl-8 pt-6 space-y-6">
                            {services.length > 0 ? (
                                Object.keys(groupedFilteredServices).length > 0 ? (
                                    <div
                                        className="space-y-3 overflow-y-auto pr-2 scrollbar-modern"
                                        style={{
                                            maxHeight: rightColumnHeight ? `${Math.max(rightColumnHeight, 220)}px` : undefined,
                                            minHeight: 220,
                                        }}
                                    >
                                        {Object.entries(groupedFilteredServices).map(([category, categoryServices]) => {
                                            const isOpen = openCategories.has(category) || categoryChipFilter === category;
                                            const selectedCount = categoryServices.filter((s) =>
                                                serviceBlocks.some((b) => b.service_id === s.id)
                                            ).length;

                                            return (
                                                <div key={category} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleCategory(category)}
                                                        className="w-full flex items-center justify-between gap-3 p-5 hover:bg-muted/40 transition-colors duration-200"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Tag className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={2.5} />
                                                            <p className="text-xs uppercase tracking-wide text-accent font-bold truncate">{category}</p>
                                                            {selectedCount > 0 && (
                                                                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold shrink-0">
                                                                    {selectedCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <ChevronDown
                                                            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
                                                        />
                                                    </button>

                                                    {isOpen && (
                                                        <div className="px-5 pb-5 flex flex-wrap gap-2">
                                                            {categoryServices.map((service) => {
                                                                const checked = serviceBlocks.some((b) => b.service_id === service.id);
                                                                return (
                                                                    <button
                                                                        key={service.id}
                                                                        type="button"
                                                                        onClick={() => addOrRemoveServiceAsBlock(service.id, !checked)}
                                                                        title={service.description || service.name}
                                                                        className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${checked
                                                                            ? "bg-accent text-accent-foreground shadow-sm"
                                                                            : "bg-secondary/60 text-foreground hover:bg-secondary"
                                                                            }`}
                                                                    >
                                                                        {service.name}
                                                                        <span
                                                                            className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold transition-transform duration-200 shrink-0 ${checked ? "bg-accent-foreground/20" : "bg-foreground/10"
                                                                                }`}
                                                                        >
                                                                            {checked ? "×" : "+"}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">
                                        {serviceSearch
                                            ? `No services found for "${serviceSearch}"`
                                            : "No services available."}
                                    </p>
                                )
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    No services available.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {serviceBlocks.length > 0 && (
                        <Card className="relative rounded-2xl border-2 border-foreground shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                            {/* Thick left accent bar */}
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-foreground" />

                            <CardHeader className="pl-6 sm:pl-8 pb-4 border-b border-border/50 bg-foreground">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-baseline gap-4 min-w-0">
                                        <span className="font-heading text-4xl font-bold text-background/15 leading-none select-none shrink-0">
                                            ✓
                                        </span>
                                        <CardTitle className="text-lg font-heading font-bold text-background leading-tight truncate">
                                            Selected Services Overview
                                        </CardTitle>
                                    </div>
                                    <span className="text-xs font-semibold text-background/70 uppercase tracking-wide shrink-0">
                                        {serviceBlocks.length} {serviceBlocks.length === 1 ? "service" : "services"}
                                    </span>
                                </div>
                            </CardHeader>

                            <CardContent className="pl-6 sm:pl-8 pr-5 pt-5 pb-6 space-y-3">
                                {serviceBlocks.map((b, idx) => {
                                    const discountedPrice = Math.max(0, b.price - Number((b as any).discount_amount || 0));
                                    const hasDiscount = Number((b as any).discount_percent) > 0;

                                    return (
                                        <div
                                            key={`${b.service_id}-overview-${idx}`}
                                            className="rounded-2xl border-2 border-border/70 bg-card px-4 sm:px-5 py-4 hover:border-foreground transition-colors duration-200"
                                        >
                                            {/* Top row: name, category, price */}
                                            <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3 sm:gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="font-heading text-2xl font-bold text-foreground/10 leading-none select-none shrink-0">
                                                            {String(idx + 1).padStart(2, "0")}
                                                        </span>
                                                        <p className="text-base font-heading font-bold text-foreground truncate">
                                                            {b.service_name || "Service"}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 mt-2 ml-8">
                                                        {b.category ? (
                                                            <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-foreground text-background">
                                                                {b.category}
                                                            </span>
                                                        ) : null}
                                                        <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full border border-border/70 text-muted-foreground">
                                                            {(b.billing_type || "one_time").replace("_", " ")}
                                                        </span>
                                                        {b.billing_type === "monthly" ? (
                                                            <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full border border-border/70 text-muted-foreground">
                                                                {b.duration_months || 1} {(b.duration_months || 1) === 1 ? "month" : "months"}
                                                            </span>
                                                        ) : null}
                                                        {b.billing_type === "milestone" ? (
                                                            <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full border border-border/70 text-muted-foreground">
                                                                {(b.milestone_template || []).length} milestones
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    {hasDiscount ? (
                                                        <>
                                                            <p className="text-xs text-muted-foreground line-through">
                                                                {currency === "INR" ? "₹" : "$"}
                                                                {Number(b.price || 0).toLocaleString()}
                                                            </p>
                                                            <p className="text-lg font-heading font-bold text-foreground">
                                                                {currency === "INR" ? "₹" : "$"}
                                                                {discountedPrice.toLocaleString()}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <p className="text-lg font-heading font-bold text-foreground">
                                                            {currency === "INR" ? "₹" : "$"}
                                                            {Number(b.price || 0).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Bottom row: extra details */}
                                            <div className="ml-8 mt-3 pt-3 border-t border-dashed border-border/60 flex flex-wrap items-center gap-x-5 gap-y-1.5">
                                                {b.billing_type === "monthly" && b.monthly_amount ? (
                                                    <div className="text-xs text-muted-foreground">
                                                        <span className="font-semibold text-foreground">
                                                            {currency === "INR" ? "₹" : "$"}
                                                            {Number(b.monthly_amount).toLocaleString()}
                                                        </span>
                                                        {" "}/ month
                                                    </div>
                                                ) : null}
                                                {b.timeline ? (
                                                    <div className="text-xs text-muted-foreground">
                                                        Timeline: <span className="font-semibold text-foreground">{b.timeline}</span>
                                                    </div>
                                                ) : null}
                                                {hasDiscount ? (
                                                    <div className="text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded-full">
                                                        -{(b as any).discount_percent}% saved {currency === "INR" ? "₹" : "$"}
                                                        {Number((b as any).discount_amount || 0).toLocaleString()}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}
                </div>   {/* ← this closes the LEFT column */}

                {/* ========== RIGHT COLUMN (only one!) ========== */}
                <div ref={rightColumnRef} className="w-full min-w-0 space-y-6">
                    <Card className="relative rounded-2xl border-2 shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                        {/* ... Pricing card content stays exactly as it was ... */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-foreground" />

                        <CardHeader className="pl-6 sm:pl-8 pb-5 border-b border-border/50">
                            <div className="flex items-baseline gap-4">
                                <span className="font-heading text-4xl font-bold text-foreground/10 leading-none select-none">
                                    03
                                </span>
                                <CardTitle className="text-xl font-heading font-bold text-foreground leading-tight">
                                    Pricing
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pl-6 sm:pl-8 pt-6 space-y-6">
                            {serviceBlocks.map((b, idx) => {

                                const monthlyPlan =
                                    b.billing_type === "monthly"
                                        ? calculateMonthly(
                                            b.price,
                                            b.duration_months || 1
                                        )
                                        : null;

                                return (
                                    <div
                                        key={`${b.service_id}-${idx}`}
                                        className="p-4 rounded-xl border border-black bg-zinc-100 space-y-4 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.12)]">

                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="font-medium text-foreground truncate">
                                                    {b.service_name || "Service"}
                                                </p>

                                                <p className="text-xs text-muted-foreground">
                                                    Set price and billing type
                                                </p>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                                onClick={() =>
                                                    addOrRemoveServiceAsBlock(
                                                        b.service_id,
                                                        false
                                                    )
                                                }
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        {/* Billing Type */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.5} />
                                                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-bold">Billing Type</Label>
                                            </div>

                                            <Select
                                                value={b.billing_type}
                                                onValueChange={(value) => {

                                                    const billing =
                                                        value as QuotationServiceBlockBillingType;

                                                    updateBlock(idx, {

                                                        billing_type: billing,

                                                        milestone_template:

                                                            billing === "milestone"

                                                                ? (
                                                                    b.milestone_template?.length
                                                                        ? b.milestone_template
                                                                        : [
                                                                            createMilestone(0),
                                                                            createMilestone(1)
                                                                        ]
                                                                )

                                                                : b.milestone_template

                                                    });

                                                }}
                                            >
                                                <SelectTrigger className="rounded-xl w-full">
                                                    <SelectValue />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    <SelectItem value="one_time">
                                                        One-Time
                                                    </SelectItem>

                                                    <SelectItem value="monthly">
                                                        Monthly
                                                    </SelectItem>

                                                    <SelectItem value="retainer">
                                                        Retainer
                                                    </SelectItem>

                                                    <SelectItem value="milestone">
                                                        Milestone
                                                    </SelectItem>
                                                </SelectContent>

                                            </Select>
                                        </div>
                                        <div className="space-y-5">

                                            {/* Total Project Price — dynamic configurator OR manual input */}
                                            {(() => {
                                                const dynamicConfig = getServiceConfig(b.service_name);

                                                const applyPrice = (price: number, serviceConfig?: ServiceConfigState) => {
                                                    if (b.billing_type === "monthly") {
                                                        const plan = calculateMonthly(price, b.duration_months || 1);
                                                        updateBlock(idx, {
                                                            price,
                                                            monthly_amount: plan.monthlyAmount,
                                                            ...(serviceConfig ? { service_config: serviceConfig } : {}),
                                                        });
                                                    } else {
                                                        updateBlock(idx, {
                                                            price,
                                                            ...(serviceConfig ? { service_config: serviceConfig } : {}),
                                                        });
                                                    }
                                                };

                                                if (dynamicConfig) {
                                                    return (
                                                        <ServiceConfigurator
                                                            serviceName={b.service_name}
                                                            currency={currency}
                                                            configState={b.service_config}
                                                            onChange={(state: any, price: number) => applyPrice(price, state)}
                                                        />
                                                    );
                                                }

                                                return (
                                                    <div className="space-y-2">
                                                        <Label>Total Project Price</Label>
                                                        <Input
                                                            type="number"
                                                            value={b.price}
                                                            onChange={(e) => applyPrice(Number(e.target.value))}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                );
                                            })()}

                                            {/* Per-service discount percentage */}
                                            <div className="space-y-2">
                                                <Label>Discount (optional)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        value={(b as any).discount_percent ?? ""}
                                                        onChange={(e) => {
                                                            const value = e.target.value;

                                                            if (value === "") {
                                                                updateBlock(idx, {
                                                                    discount_percent: undefined,
                                                                    discount_amount: 0,
                                                                } as Partial<QuotationServiceBlock>);
                                                                return;
                                                            }

                                                            const raw = Number(value);
                                                            const clampedPercent = Math.min(100, Math.max(0, raw));
                                                            const amount = Math.round((b.price * clampedPercent) / 100);

                                                            updateBlock(idx, {
                                                                discount_percent: clampedPercent,
                                                                discount_amount: amount,
                                                            } as Partial<QuotationServiceBlock>);
                                                        }}
                                                        className="pr-8 w-full"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                                        %
                                                    </span>
                                                </div>
                                                {Number((b as any).discount_percent) > 0 ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        −{currency === "INR" ? "₹" : "$"}
                                                        {Number((b as any).discount_amount || 0).toLocaleString()}
                                                        {" · Discounted price: "}
                                                        {currency === "INR" ? "₹" : "$"}
                                                        {Math.max(0, b.price - Number((b as any).discount_amount || 0)).toLocaleString()}
                                                    </p>
                                                ) : null}
                                            </div>

                                            {/* Show only for milestone billing */}
                                            {b.billing_type === "milestone" && (
                                                <>
                                                    {/* Number of Milestones */}

                                                    <div className="space-y-2">

                                                        <Label>Number of Milestones</Label>

                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={10}
                                                            value={b.milestone_count ?? 1}
                                                            onChange={(e) => {

                                                                const count = Math.max(
                                                                    1,
                                                                    Number(e.target.value)
                                                                );

                                                                updateBlock(idx, {
                                                                    milestone_count: count,
                                                                    milestone_template: generateMilestones(count),
                                                                });

                                                            }}
                                                            className="w-full"
                                                        />

                                                    </div>

                                                    {/* Milestone Rows */}

                                                    <div className="space-y-3">

                                                        {(b.milestone_template ?? []).map((m: any) => (

                                                            <div
                                                                key={m.id}
                                                                className="grid grid-cols-1 sm:grid-cols-[2fr_110px_150px] gap-3 items-center"
                                                            >

                                                                <Input
                                                                    value={m.label}
                                                                    placeholder="Milestone Name"
                                                                    className="w-full"
                                                                    onChange={(e) => {

                                                                        updateBlock(idx, {
                                                                            milestone_template: updateMilestoneLabel(
                                                                                b.milestone_template ?? [],
                                                                                m.id,
                                                                                e.target.value
                                                                            ),
                                                                        });

                                                                    }}
                                                                />

                                                                <div className="relative">

                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        max={100}
                                                                        value={m.percentage}
                                                                        className="pr-8 w-full"
                                                                        onChange={(e) => {
                                                                            const percentage = Math.min(
                                                                                100,
                                                                                Math.max(
                                                                                    0,
                                                                                    parseInt(e.target.value.replace(/^0+(?=\d)/, ""), 10) || 0
                                                                                )
                                                                            );

                                                                            const updated = updateMilestonePercentage(
                                                                                b.milestone_template ?? [],
                                                                                m.id,
                                                                                percentage,
                                                                                b.price
                                                                            );

                                                                            updateBlock(idx, {
                                                                                milestone_template: updated,
                                                                            });
                                                                        }}
                                                                    />

                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                                                        %
                                                                    </span>

                                                                </div>

                                                                <div className="h-10 rounded-xl border bg-muted/40 flex items-center justify-center font-semibold">

                                                                    {currency === "INR" ? "₹" : "$"}

                                                                    {m.amount.toLocaleString()}

                                                                </div>

                                                            </div>

                                                        ))}

                                                    </div>

                                                    {/* Summary */}

                                                    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">

                                                        <div className="flex justify-between gap-2">

                                                            <span>Total Percentage</span>

                                                            <span
                                                                className={
                                                                    calculateTotalPercentage(
                                                                        b.milestone_template ?? []
                                                                    ) === 100
                                                                        ? "font-semibold text-green-600"
                                                                        : "font-semibold text-red-600"
                                                                }
                                                            >
                                                                {calculateTotalPercentage(
                                                                    b.milestone_template ?? []
                                                                )}
                                                                %
                                                            </span>

                                                        </div>

                                                        <div className="flex justify-between gap-2">

                                                            <span>Remaining</span>

                                                            <span className="font-semibold">

                                                                {calculateRemainingPercentage(
                                                                    b.milestone_template ?? []
                                                                )}
                                                                %

                                                            </span>

                                                        </div>

                                                        <div className="border-t pt-3 flex justify-between gap-2 text-lg font-bold">

                                                            <span>Total Amount</span>

                                                            <span>

                                                                {currency === "INR" ? "₹" : "$"}

                                                                {calculateMilestoneTotal(
                                                                    b.milestone_template ?? []
                                                                ).toLocaleString()}

                                                            </span>

                                                        </div>

                                                    </div>
                                                </>
                                            )}

                                        </div>

                                        {/* Monthly Duration */}

                                        {b.billing_type === "monthly" && (

                                            <div className="space-y-2">

                                                <Label>Duration (Months)</Label>

                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={b.duration_months || 1}
                                                    onChange={(e) => {

                                                        const months = Math.max(
                                                            1,
                                                            Number(e.target.value)
                                                        );

                                                        const plan = calculateMonthly(
                                                            b.price,
                                                            months
                                                        );

                                                        updateBlock(idx, {

                                                            duration_months: months,

                                                            monthly_amount:
                                                                plan.monthlyAmount,

                                                        });

                                                    }}
                                                    className="rounded-xl w-full"
                                                />

                                            </div>

                                        )}

                                        {/* Monthly Summary */}

                                        {monthlyPlan && (

                                            <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 space-y-3">

                                                <div className="flex justify-between gap-2 text-sm">

                                                    <span className="text-muted-foreground">
                                                        Total Project Cost
                                                    </span>

                                                    <span className="font-semibold">
                                                        {currency === "INR" ? "₹" : "$"}
                                                        {monthlyPlan.totalAmount.toLocaleString()}
                                                    </span>

                                                </div>

                                                <div className="flex justify-between gap-2 text-sm">

                                                    <span className="text-muted-foreground">
                                                        Monthly Payment
                                                    </span>

                                                    <span className="font-bold text-primary text-lg">
                                                        {currency === "INR" ? "₹" : "$"}
                                                        {(monthlyPlan.monthlyAmount ?? 0).toLocaleString()}
                                                    </span>

                                                </div>

                                                <div className="text-xs text-center text-muted-foreground border-t pt-2">

                                                    {monthlyPlan.durationMonths} Monthly Payments

                                                </div>

                                            </div>

                                        )}

                                    </div>
                                );

                            })}
                        </CardContent>
                    </Card>
                    <Card className="relative lg:sticky lg:top-6 rounded-2xl border border-border/60 overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300">
                        {/* Thick left accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-foreground" />

                        <CardHeader className="pl-6 sm:pl-8 pb-4 border-b border-border/50">
                            <CardTitle className="font-heading text-base font-bold text-foreground">Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-6 sm:pl-8 pt-4 space-y-2 ">
                            <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="text-muted-foreground  text-black">Selected services</span>
                                <span className="text-foreground font-medium  text-black">{serviceBlocks.length}</span>
                            </div>
                            {derivedTotals.monthly > 0 ? (
                                <div className="flex items-center justify-between gap-2 text-sm">
                                    <span className="text-muted-foreground">Monthly</span>
                                    <span className="text-foreground font-medium">{(currency === "INR" ? "₹" : "$")}{derivedTotals.monthly.toLocaleString()}</span>
                                </div>
                            ) : null}
                            {derivedTotals.one_time > 0 ? (
                                <div className="flex items-center justify-between gap-2 text-sm">
                                    <span className="text-muted-foreground">One-time</span>
                                    <span className="text-foreground font-medium">{(currency === "INR" ? "₹" : "$")}{derivedTotals.one_time.toLocaleString()}</span>
                                </div>
                            ) : null}

                            <div className="flex items-center justify-between gap-2 text-sm pt-1">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="text-foreground font-medium">{(currency === "INR" ? "₹" : "$")}{derivedTotals.total.toLocaleString()}</span>
                            </div>

                            {discountAmount > 0 ? (
                                <div className="flex items-center justify-between gap-2 text-sm text-red-600">
                                    <span>Total discount</span>
                                    <span className="font-medium">-{(currency === "INR" ? "₹" : "$")}{discountAmount.toLocaleString()}</span>
                                </div>
                            ) : null}

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 mt-1">
                                <span className="font-heading font-bold text-foreground">Total</span>
                                <span className="font-heading font-bold text-foreground">{(currency === "INR" ? "₹" : "$")}{finalTotal.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}