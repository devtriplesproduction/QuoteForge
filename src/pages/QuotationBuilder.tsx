
//QuotationBuilder.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, Pencil, Save, Send, UserPlus, X, FileText, ListChecks, Package, Clock, Wallet, ScrollText, ChevronRight, Users, Calendar as CalendarIcon, Tag, ChevronDown, Loader2 } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import Step1BasicInfo from "@/components/quotation/Step1BasicInfo";
import Step2ServicesAndPricing from "@/components/quotation/Step2ServicesAndPricing";
import Step3ServiceDetails from "@/components/quotation/Step3ServiceDetails";
import {
  generateMilestones,
  updateMilestonePercentage,
  calculateMilestoneTotal,
  calculateRemainingPercentage,
  updateMilestoneLabel,
  calculateTotalPercentage,
  createMilestone,
  isMilestonePlanValid,
  normalizeMilestonesFromTemplate, // add this
} from "@/components/quotation/milestoneCal";

import {
  DEFAULT_INTRODUCTION,
  DEFAULT_SCOPE,
  DEFAULT_PAYMENT_TERMS,
  DEFAULT_TERMS_CONDITIONS,
} from "@/lib/quotationDefaults";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/pages/DatePicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import AddClientDialog from "@/components/clients/AddClientDialog";
import { RichEditor } from "@/components/ui/RichText";
import type { PricingModel, Quotation, QuotationSectionToggles } from "@/lib/types";
import { nowIso } from "@/lib/dates";
// import { QuotationLayout } from "@/components/quotation/QuotationLayout";
import ProfessionalQuotationLayout from "@/components/quotation/ProfessionalQuotationLayout";
import ProfessionalQuotationPDF from "@/components/quotation/ProfessionalQuotationPDF";
import {
  getQuotationServiceBlocks,
  getServiceBlockTotals,
  type QuotationServiceBlock,
  type QuotationServiceBlockBillingType,
} from "@/lib/quotationServiceBlocks";
import { calculateMonthly } from "@/components/quotation/pricing";
import ServiceConfigurator from "@/components/service-configurator/ServiceConfigurator";
import { getServiceConfig } from "@/lib/service-configs";
import type { ServiceConfigState } from "@/lib/pricing-engine";



// const monthly = calculateMonthly(
//   block.price,
//   block.durationMonths
// );

type BuilderStep = 1 | 2 | 3 | 4 | 5;

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function dedupeTitles(list: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of list) {
    const s = String(t || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function getCategoryTermsText(
  termsConditions: { category: string; clause: string; is_general: boolean | number; sort_order: number }[],
  category: string | undefined
): string {
  if (!termsConditions?.length || !category) return "";

  const rows = termsConditions
    .filter(
      (t) =>
        !Number(t.is_general) &&
        t.category?.toLowerCase() === category.toLowerCase()
    )
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!rows.length) return "";

  return rows.map((t) => `• ${t.clause}`).join("\n");
}

export default function QuotationBuilder() {
  // const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const {
    clients,
    services,
    termsConditions,
    quotations,
    addQuotation,
    updateQuotation,
    deleteQuotation,
    refreshQuotations,
    getQuotationById,
    currency,
    brandKit,
  } = useApp();
  const serviceLibraryById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  const categoriesInUse = useMemo(
    () => Array.from(new Set(services.map((s) => s.category).filter(Boolean))) as string[],
    [services]
  );

  const today = new Date().toISOString().split("T")[0];
  const defaultValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const DRAFT_LS_KEY = "currentDraftId";
  const draftIdParam = searchParams.get("draftId");
  const [titleError, setTitleError] = useState("");

  const rightColumnRef = useRef<HTMLDivElement>(null);
  const [rightColumnHeight, setRightColumnHeight] = useState<number | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Never auto-resume from localStorage — only resume via explicit URL param
  // This prevents old quotations from being overwritten when creating new ones
  const [draftId, setDraftId] = useState<string | null>(draftIdParam ?? null);

  const DEFAULT_SECTION_TOGGLES = useMemo<QuotationSectionToggles>(
    () => ({
      introduction: true,
      scope_of_work: true,
      payment_terms: true,
      terms_conditions: true,
    }),
    [],
  );

  const [step, setStep] = useState<BuilderStep>(1);
  const [serviceSearch, setServiceSearch] = useState("");
  const [categoryChipFilter, setCategoryChipFilter] = useState<string>("all");
  const [showAllCategoryChips, setShowAllCategoryChips] = useState(false);

  // STEP 1 — Basic Info (NO notes here)
  const [formData, setFormData] = useState({
    title: "",
    client_id: "",
    quote_date: today,
    valid_until: defaultValidUntil,
  });

  // STEP 2-3 — Service Blocks (source of truth)
  const [serviceBlocks, setServiceBlocks] = useState<QuotationServiceBlock[]>([]);

  const quotationTerms = useMemo(() => {
    if (!termsConditions.length) return [];

    // General Terms
    const general = termsConditions.filter(
      (t) => Number(t.is_general) === 1
    );

    // Unique categories of selected services
    const selectedCategories = [
      ...new Set(
        serviceBlocks
          .map((b) => {
            const service = services.find((s) => s.id === b.service_id);
            return service?.category;
          })
          .filter(Boolean)
      ),
    ];

    // Category specific terms (max 3)
    const categoryTerms = selectedCategories.flatMap((category) =>
      termsConditions
        .filter(
          (t) =>
            Number(t.is_general) === 0 &&
            t.category === category
        )
        .slice(0, 3)
    );

    return [...general, ...categoryTerms];
  }, [termsConditions, serviceBlocks, services]);




  // Step 4 (Global Terms) has been removed.
  // Introduction and the global payment-terms fallback are no longer
  // collected — payment terms live per-service, and terms & conditions
  // are assembled automatically (general + each selected service's terms).
  const sectionToggles = DEFAULT_SECTION_TOGGLES;

  const [resuming, setResuming] = useState(false);
  const [markingSent, setMarkingSent] = useState(false);

  // Draft conflict modal (preserve existing behavior)
  const [draftConflictOpen, setDraftConflictOpen] = useState(false);
  const [conflictDraftId, setConflictDraftId] = useState<string | null>(null);
  const [conflictDraftIds, setConflictDraftIds] = useState<string[]>([]);
  const conflictCheckedRef = useRef(false);
  const conflictRefreshAttemptedRef = useRef(false);

  const resumeHydratedRef = useRef<string | null>(null);
  const resumeRefreshAttemptedRef = useRef<string | null>(null);

  // Add Client Dialog
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [clientSelectOpen, setClientSelectOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  const titleSuggestions = useMemo(() => dedupeTitles((quotations || []).map((q) => q.title || "")).slice(0, 30), [quotations]);

  const filteredClientsForSelect = useMemo(() => {
    const q = clientSearchQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const business = (c.business_name || "").toLowerCase();
      return name.includes(q) || business.includes(q);
    });
  }, [clients, clientSearchQuery]);

  const openAddClientDialog = useCallback(() => {
    setClientSelectOpen(false);
    // Radix Select can swallow the immediate open; defer to next tick.
    setTimeout(() => setIsAddClientOpen(true), 0);
  }, []);

  const resetToFreshWizard = useCallback(() => {
    resumeHydratedRef.current = null;
    resumeRefreshAttemptedRef.current = null;

    setDraftId(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("draftId");
      return next;
    });
    localStorage.removeItem(DRAFT_LS_KEY);

    setStep(1);
    setFormData({ title: "", client_id: "", quote_date: today, valid_until: defaultValidUntil });
    setServiceBlocks([]);
  }, [defaultValidUntil, setSearchParams, today]);

  // Cross-tab sync: if currentDraftId changes elsewhere, reflect it here.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== DRAFT_LS_KEY) return;

      const nextId = e.newValue;
      if (!nextId) {
        resetToFreshWizard();
        return;
      }

      if (nextId !== draftId) {
        resumeHydratedRef.current = null;
        resumeRefreshAttemptedRef.current = null;
        setDraftId(nextId);
        setSearchParams({ draftId: nextId });
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [draftId, resetToFreshWizard, setSearchParams]);

  // If user clicked "New Quotation" while an unfinished draft exists, prompt for action.
  useEffect(() => {
    if (draftIdParam) return; // explicit resume via URL
    if (draftId) return; // resuming via stored pointer
    if (conflictCheckedRef.current) return;

    // Refresh exactly once, then decide based on current state.
    if (!conflictRefreshAttemptedRef.current) {
      conflictRefreshAttemptedRef.current = true;
      refreshQuotations().catch((err) => {
        if (import.meta.env.DEV) console.error("Failed to refresh quotations", err);
      });
      return;
    }

    conflictCheckedRef.current = true;

    const activeDrafts = quotations
      .filter((q) => q.status === "draft" && !q.is_template)
      .filter((q) => !q.sent_at && !q.accepted_at && !q.invoiced_at);

    if (activeDrafts.length === 0) {
      localStorage.removeItem(DRAFT_LS_KEY);
      return;
    }

    const byUpdatedAtDesc = activeDrafts
      .slice()
      .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));

    const preferred = byUpdatedAtDesc[0];
    if (!preferred) return;

    setConflictDraftIds(byUpdatedAtDesc.map((d) => d.id));
    setConflictDraftId(preferred.id);
    setDraftConflictOpen(true);
  }, [draftId, draftIdParam, quotations, refreshQuotations]);

  useEffect(() => {
    const el = rightColumnRef.current;
    if (!el) return;

    const update = () => setRightColumnHeight(el.offsetHeight);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => observer.disconnect();
  }, [serviceBlocks]); // re-measure whenever selections change (Pricing card grows/shrinks)

  const handleContinuePrevious = () => {
    if (!conflictDraftId) return;
    setDraftConflictOpen(false);
    localStorage.setItem(DRAFT_LS_KEY, conflictDraftId);
    resumeHydratedRef.current = null;
    resumeRefreshAttemptedRef.current = null;
    setDraftId(conflictDraftId);
    setSearchParams({ draftId: conflictDraftId });
  };

  const startNewInProgressRef = useRef(false);
  const handleStartNew = async () => {
    if (startNewInProgressRef.current) return;
    startNewInProgressRef.current = true;

    const idsToDelete = conflictDraftIds.length > 0 ? conflictDraftIds : conflictDraftId ? [conflictDraftId] : [];

    try {
      await Promise.all(idsToDelete.map((id) => deleteQuotation(id)));
      await refreshQuotations();

      localStorage.removeItem(DRAFT_LS_KEY);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("draftId");
        return next;
      });
      setDraftId(null);

      setDraftConflictOpen(false);

      // Reset UI state
      setStep(1);
      setFormData({ title: "", client_id: "", quote_date: today, valid_until: defaultValidUntil });
      setServiceBlocks([]);

    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to start a new quotation", err);
      toast({
        title: "Could not start a new quotation",
        description: "We couldn't reset your draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      startNewInProgressRef.current = false;
    }
  };

  // Resume draft (URL param or stored pointer)
  useEffect(() => {
    if (!draftId) return;
    if (resumeHydratedRef.current === draftId) return;

    const q = getQuotationById(draftId) ?? quotations.find((x) => x.id === draftId);

    if (!q) {
      if (resumeRefreshAttemptedRef.current !== draftId) {
        resumeRefreshAttemptedRef.current = draftId;
        setResuming(true);
        refreshQuotations().finally(() => {
          setResuming(false);
        });
        return;
      }

      localStorage.removeItem(DRAFT_LS_KEY);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("draftId");
        return next;
      });
      setDraftId(null);
      return;
    }

    resumeHydratedRef.current = draftId;

    // Always resume at Step 1 for predictable UX.
    // setStep(1);

    setStep(((q as any).current_step || 1) as BuilderStep);

    setFormData({
      title: q.title || "",
      client_id: q.client_id || "",
      quote_date: q.quote_date || today,
      valid_until: q.valid_until || defaultValidUntil,
    });

    // Source of truth: service_blocks. If missing, fall back to legacy line-items.

    // Source of truth: service_blocks. If missing, fall back to legacy line-items.
    const blocksUnknown = (q as unknown as { service_blocks?: unknown }).service_blocks;
    if (Array.isArray(blocksUnknown) && blocksUnknown.length > 0) {
      setServiceBlocks(
        getQuotationServiceBlocks(q).map((b) => {

          const lib = serviceLibraryById.get(b.service_id);

          return {

            ...b,

            // ---------- Repair Monthly Amount ----------
            monthly_amount:
              b.billing_type === "monthly"
                ? (
                  b.monthly_amount ??
                  calculateMonthly(
                    Number(b.price || 0),
                    Number(b.duration_months || 1)
                  ).monthlyAmount
                )
                : b.monthly_amount,

            // ---------- Repair Missing Fields ----------
            description:
              b.description || lib?.description || "",

            scope_of_work:
              b.scope_of_work || lib?.scope_of_work || "",

            deliverables:
              b.deliverables || lib?.deliverables || "",

            timeline:
              b.timeline || lib?.timeline || "",

            payment_terms:
              b.payment_terms || lib?.payment_terms || "",

            service_terms:
              b.service_terms || lib?.service_terms || "",

            terms_conditions_text:
              b.terms_conditions_text ||
              getCategoryTermsText(termsConditions, b.category || lib?.category || ""),

          };

        })
      );
    } else if ((q.services || []).length > 0) {
      setServiceBlocks(
        (q.services || []).map((it) => {
          const lib = serviceLibraryById.get(it.service_id || "");
          return {
            service_id: String(it.service_id || "default"),
            service_name: String(it.service_name || "Service"),
            description: String(it.description || lib?.description || ""),
            scope_of_work: String(lib?.scope_of_work || ""),
            deliverables: String(lib?.deliverables || ""),
            timeline: String(lib?.timeline || ""),
            price: n(it.total),
            billing_type: (
              (it as any).billing_type || "one_time"
            ) as QuotationServiceBlockBillingType,
            payment_terms: String(lib?.payment_terms || ""),
            service_terms: String(lib?.service_terms || ""),
          };
        }),
      );
    } else {
      setServiceBlocks([]);
    }

    setSearchParams({ draftId });
  }, [
    DEFAULT_SECTION_TOGGLES,
    defaultValidUntil,
    draftId,
    getQuotationById,
    quotations,
    refreshQuotations,
    setSearchParams,
    today,
    serviceLibraryById,
  ]);

  // Create a draft immediately if we don't have one (required for Step 1 autosave)

  // Draft will only be created when the user clicks "Save to Draft".

  const validateStep1 = () => {
    if (!formData.title.trim()) {
      toast({ title: "Missing title", description: "Please enter a quotation title", variant: "destructive" });
      return false;
    }
    const duplicate = quotations.find(
      q =>
        q.title.trim().toLowerCase() ===
        formData.title.trim().toLowerCase() &&
        q.id !== draftId
    );

    if (duplicate) {
      toast({
        title: "Duplicate quotation title",
        description: "A quotation with this title already exists.",
        variant: "destructive",
      });

      return false;
    }
    if (!formData.client_id) {
      toast({ title: "Missing client", description: "Please select a client", variant: "destructive" });
      return false;
    }
    if (!formData.quote_date || !formData.valid_until) {
      toast({ title: "Missing dates", description: "Please select quotation dates", variant: "destructive" });
      return false;
    }
    return true;
  };


  const derivedTotals = useMemo(() => getServiceBlockTotals(serviceBlocks), [serviceBlocks]);

  // Each service block now carries its own `discount_amount` (a flat currency
  // amount, not a percent) — set per-service in the Pricing card. The total
  // discount is just the sum of every service's discount.
  const discountAmount = useMemo(
    () => serviceBlocks.reduce((sum, b) => sum + Number((b as any).discount_amount || 0), 0),
    [serviceBlocks]
  );

  const finalTotal = useMemo(
    () => Math.max(0, derivedTotals.total - discountAmount),
    [derivedTotals.total, discountAmount]
  );

  const autoGeneratedTerms = useMemo(() => {
    if (!termsConditions?.length) return "";

    // Get unique categories from selected services
    const selectedCategories = [
      ...new Set(
        serviceBlocks
          .map((s) => s.category)
          .filter(Boolean)
      ),
    ];

    // General terms
    const generalTerms = termsConditions
      .filter((t) => t.is_general)
      .sort((a, b) => a.sort_order - b.sort_order);

    // Category terms
    const categoryTerms = selectedCategories.flatMap((category) => {
      const rows = termsConditions
        .filter(
          (t) =>
            !t.is_general &&
            t.category?.toLowerCase() === category?.toLowerCase()
        )
        .sort((a, b) => a.sort_order - b.sort_order);



      if (!rows.length) return [];

      return [
        {
          heading: category,
        },
        ...rows,
      ];
    });

    let text = "GENERAL TERMS\n\n";

    generalTerms.forEach((t, index) => {
      text += `${index + 1}. ${t.clause}\n`;
    });

    categoryTerms.forEach((item) => {
      if ("heading" in item) {
        text += `\n\n${item.heading.toUpperCase()}\n\n`;
      } else {
        text += `• ${item.clause}\n`;
      }
    });

    console.log(text);
    return text;

  }, [serviceBlocks, termsConditions]);

  const autoGeneratedPaymentTerms = useMemo(() => {
    const withTerms = serviceBlocks.filter((b) => (b.payment_terms || "").trim());
    if (!withTerms.length) return "";

    if (withTerms.length === 1) {
      return withTerms[0].payment_terms || "";
    }

    return withTerms
      .map((b) => `${(b.service_name || "Service").toUpperCase()}\n\n${b.payment_terms}`)
      .join("\n\n\n");
  }, [serviceBlocks]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      if (!service.is_active) return false;
      if (categoryChipFilter !== "all" && service.category !== categoryChipFilter) return false;
      return true;
    });
  }, [services, categoryChipFilter]);

  const groupedFilteredServices = useMemo(() => {
    const groups: Record<string, typeof filteredServices> = {};
    filteredServices.forEach((service) => {
      const cat = service.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(service);
    });
    return groups;
  }, [filteredServices]);

  const persistDraft = useCallback(
    async (
      partial: Partial<Quotation>,
      quotationId?: string
    ) => {

      const id = quotationId ?? draftId;

      if (!id) return;

      const q = getQuotationById(id);
      if (!q) return;

      // Keep legacy quotation.services in sync for compatibility (DO NOT remove).
      const legacyServices = serviceBlocks.map((b, idx) => {
        const lib = serviceLibraryById.get(b.service_id);
        const pricing_model = (lib?.pricing_model || "fixed") as PricingModel;

        return {
          id: `${id}-${b.service_id}-${idx}`,
          quotation_id: id,
          service_id: b.service_id,
          service_name: b.service_name,
          description: b.description || null,
          pricing_model,
          quantity: 1,
          unit_price: n(b.price),
          total: n(b.price),
          is_included: true,
          custom_notes: null,
          sort_order: idx,
          created_at: q.created_at,
        };
      });

      const updated: Quotation = {
        ...q,
        ...partial,
        title: partial.title ?? q.title,
        client_id: partial.client_id ?? q.client_id,
        quote_date: partial.quote_date ?? q.quote_date,
        valid_until: partial.valid_until ?? q.valid_until,
        section_toggles: partial.section_toggles ?? q.section_toggles,
        introduction: partial.introduction ?? q.introduction,
        payment_terms_text: DEFAULT_PAYMENT_TERMS,
        terms_conditions_text: partial.terms_conditions_text ?? q.terms_conditions_text,
        current_step:
          partial.current_step ??
          q.current_step,
        service_blocks: partial.service_blocks !== undefined ? partial.service_blocks : serviceBlocks,
        services: partial.services ?? legacyServices,
        subtotal: partial.subtotal ?? derivedTotals.total,
        discount: partial.discount ?? discountAmount,
        discount_type: partial.discount_type ?? "fixed",
        total: partial.total ?? finalTotal,
        updated_at: nowIso(),
      } as Quotation;

      await updateQuotation(updated);
    },
    [derivedTotals.total, discountAmount, draftId, finalTotal, getQuotationById, serviceBlocks, serviceLibraryById, updateQuotation, autoGeneratedPaymentTerms,],
  );

  const addOrRemoveServiceAsBlock = (serviceId: string, checked: boolean) => {
    const lib = serviceLibraryById.get(serviceId);
    if (!lib) return;
    console.log("Selected Service Object:", lib);
    console.log("Base Price:", lib?.base_price);
    console.log("MILESTONE TEMPLATE", lib.milestone_template);

    setServiceBlocks((prev) => {
      if (checked) {
        if (prev.some((b) => b.service_id === serviceId)) return prev;

        // Parse the library's predefined milestone template once
        const rawTemplate =
          lib.billing_type === "milestone"
            ? typeof lib.milestone_template === "string"
              ? JSON.parse(lib.milestone_template)
              : lib.milestone_template || []
            : [];

        const price =
          lib.billing_type === "milestone"
            ? rawTemplate.length > 0
              ? rawTemplate.reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0)
              : Number(lib.base_price)
            : Number(lib.base_price);

        return [

          {
            service_id: lib.id,
            service_name: lib.name,
            description: String(lib.description || ""),
            category: String(lib.category || ""),
            subcategory: String(("subcategory" in lib ? (lib as { subcategory?: string | null }).subcategory : "") || ""),
            scope_of_work: String(lib.scope_of_work || ""),
            deliverables: String(lib.deliverables || ""),
            timeline: String(lib.timeline || ""),
            terms_conditions_text: getCategoryTermsText(termsConditions, String(lib.category || "")),
            price,
            billing_type: (
              lib.billing_type === "one_time" ||
                lib.billing_type === "monthly" ||
                lib.billing_type === "milestone" ||
                lib.billing_type === "retainer"
                ? lib.billing_type
                : "one_time"
            ) as QuotationServiceBlockBillingType,

            duration_months: (() => {
              const months =
                ("duration_months" in lib
                  ? (lib as { duration_months?: number | null }).duration_months
                  : null) ?? 1;
              return Number(months) || 1;
            })(),

            monthly_amount:
              lib.billing_type === "monthly"
                ? calculateMonthly(
                  Number(lib.base_price),
                  Number(
                    ("duration_months" in lib
                      ? (lib as { duration_months?: number | null }).duration_months
                      : 1) || 1
                  )
                ).monthlyAmount
                : undefined,

            payment_terms: String(("payment_terms" in lib ? (lib as { payment_terms?: string | null }).payment_terms : "") || ""),
            service_terms: String(lib.service_terms || ""),

            // 🔧 normalized instead of raw copy
            milestone_template:
              lib.billing_type === "milestone"
                ? normalizeMilestonesFromTemplate(rawTemplate, price)
                : [],

            // 🔧 count now matches the actual number of predefined milestones
            milestone_count:
              lib.billing_type === "milestone" && rawTemplate.length > 0
                ? rawTemplate.length
                : undefined,
          },
          ...prev,
        ];
      }
      return prev.filter((b) => b.service_id !== serviceId);
    });
  };

  const updateBlock = (idx: number, patch: Partial<QuotationServiceBlock>) => {
    setServiceBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };

  const goNext = async () => {
    if (step === 1) {
      if (!validateStep1()) return;

      for (const block of serviceBlocks) {
        if (block.billing_type !== "milestone") continue;

        const milestones = block.milestone_template ?? [];

        if (milestones.length === 0) {
          toast({
            title: "Milestones Required",
            description: `Please create milestones for "${block.service_name}".`,
            variant: "destructive",
          });
          return;
        }

        const totalPercentage = calculateTotalPercentage(milestones);

        if (totalPercentage !== 100) {
          toast({
            title: "Invalid Milestone Plan",
            description: `Milestones for "${block.service_name}" must total exactly 100%.`,
            variant: "destructive",
          });
          return;
        }

        if (calculateMilestoneTotal(milestones) !== block.price) {
          toast({
            title: "Milestone Amount Mismatch",
            description: `Milestone amount must equal ₹${block.price}.`,
            variant: "destructive",
          });
          return;
        }
      }

      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(5);
      return;
    }
  };

  const goBack = () => {
    if (step === 1) return;
    if (step === 3) {
      setStep(1);
      return;
    }
    if (step === 5) {
      setStep(3);
      return;
    }
  };



  const buildPreviewQuotation = (): Quotation | null => {

    if (!draftId) {
      return {
        id: "preview",
        quotation_number: `QT-${Date.now()}`,

        title: formData.title,
        client_id: formData.client_id || null,

        quote_date: formData.quote_date,
        valid_until: formData.valid_until,

        introduction: null,
        scope_of_work: null,

        payment_terms_text: DEFAULT_PAYMENT_TERMS,
        terms_conditions_text: autoGeneratedTerms || null,
        currency,

        subtotal: derivedTotals.total,
        total: finalTotal,
        discount: discountAmount,
        discount_type: "fixed",
        tax_rate: 0,
        tax_amount: 0,

        status: "draft",

        services: [],
        service_blocks: serviceBlocks,

        section_toggles: sectionToggles,

        quotation_sections: null,
        selected_points: null,

        notes: null,

        is_template: false,
        template_name: null,

        share_token: null,

        sent_at: null,
        accepted_at: null,
        invoiced_at: null,

        current_step: step,

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),

        client: clients.find(c => c.id === formData.client_id),

      } as unknown as Quotation;
    }

    const q =
      getQuotationById(draftId) ||
      quotations.find(x => x.id === draftId);

    if (!q) {
      console.log('Quotation Not found');
      return {
        id: draftId,
        title: formData.title,
        client_id: formData.client_id || null,
        quote_date: formData.quote_date,
        valid_until: formData.valid_until,
        quotation_number: `QT-${draftId}`,
        status: 'draft',
        service_blocks: serviceBlocks,
        services: [],
        subtotal: derivedTotals.total,
        total: derivedTotals.total,
        discount: 0,
        tax_rate: 0,
        tax_amount: 0,
        currency,
        introduction: null,
        payment_terms_text: DEFAULT_PAYMENT_TERMS,
        terms_conditions_text: autoGeneratedTerms || null,
        section_toggles: sectionToggles,
        client: clients.find(c => c.id === formData.client_id),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as Quotation;
    }

    const currentClient =
      clients.find(c => c.id === formData.client_id) || q.client;

    return {
      ...q,
      title: formData.title,
      client_id: formData.client_id || null,
      quote_date: formData.quote_date,
      valid_until: formData.valid_until,
      introduction: null,
      payment_terms_text: DEFAULT_PAYMENT_TERMS,
      terms_conditions_text: autoGeneratedTerms || null,
      section_toggles: sectionToggles,
      service_blocks: serviceBlocks,
      subtotal: derivedTotals.total,
      total: derivedTotals.total,
      client: currentClient,
    } as Quotation;
  };

  const handleSaveDraft = async (
    status: "draft" | "sent" = "draft"
  ): Promise<string | null> => {

    if (!validateStep1()) return null;
    try {
      // Update existing draft
      if (draftId) {

        await persistDraft({
          status,
          sent_at:
            status === "sent"
              ? new Date().toISOString()
              : null,
          current_step: step,
        });

        toast({
          title: "Draft Updated",
          description: `Quotation saved at Step ${step}.`,
        });

        return draftId;
      }



      // Create new draft
      const createdId = await addQuotation({
        quotation_number: `QT-${Date.now()}`,
        title: formData.title,
        client_id: formData.client_id || null,

        quote_date: formData.quote_date,
        valid_until: formData.valid_until,

        introduction: null,

        scope_of_work: null,

        payment_terms_text: DEFAULT_PAYMENT_TERMS,

        terms_conditions_text: autoGeneratedTerms || null,

        currency,

        subtotal: derivedTotals.total,

        total: finalTotal,

        discount: discountAmount,

        discount_type: "fixed",

        tax_rate: 0,

        tax_amount: 0,

        services: [],

        service_blocks: serviceBlocks,

        section_toggles: sectionToggles,

        quotation_sections: null,

        selected_points: null,

        notes: null,

        is_template: false,

        template_name: null,

        share_token: null,

        status,

        sent_at: status === "sent"
          ? new Date().toISOString()
          : null,

        accepted_at: null,

        invoiced_at: null,

        current_step: step,
      });

      if (!createdId) {
        throw new Error("Failed to create draft");
      }

      setDraftId(createdId);

      localStorage.setItem(DRAFT_LS_KEY, createdId);

      setSearchParams({ draftId: createdId });

      toast({
        title: "Draft Saved",
        description: `Quotation saved at Step ${step}.`,
      });

      return createdId;

    } catch (err) {
      console.error(err);

      toast({
        title: "Error",
        description: "Unable to save draft.",
        variant: "destructive",
      });

      return null;
    }
  };

  const handleMarkSent = async () => {

    if (!validateStep1()) return;

    setMarkingSent(true);

    try {
      let id = draftId;

      if (!id) {

        id = await handleSaveDraft("sent");

        if (!id) return;

      } else {

        const now = new Date().toISOString();

        await persistDraft(
          {
            status: "sent",
            sent_at: now,
            current_step: 5,
          },
          id
        );
      }

      const publicUrl = `${window.location.origin}/public/quotation/${id}`;

      try {

        if (navigator.clipboard && window.isSecureContext) {

          await navigator.clipboard.writeText(publicUrl);

        } else {

          const textArea = document.createElement("textarea");
          textArea.value = publicUrl;
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";

          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          document.execCommand("copy");

          document.body.removeChild(textArea);
        }

        toast({
          title: "Quotation link copied",
        });

      } catch (err) {

        console.error(err);

        window.prompt("Copy quotation link:", publicUrl);

      }

      localStorage.removeItem(DRAFT_LS_KEY);
    } finally {
      setMarkingSent(false);
    }
  };

  const handleDownloadPdf = async () => {
    const q = buildPreviewQuotation();
    if (!q) return;

    try {
      const { default: ProfessionalQuotationPDF } =
        await import("@/components/quotation/ProfessionalQuotationPDF");

      const clientName =
        q.client?.business_name || q.client?.name || "Client";

      const safeClientName = clientName
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .trim();

      const safeNumber = q.quotation_number.replace(
        /[^a-zA-Z0-9-_]/g,
        "_"
      );

      const fileName = `${safeClientName} - ${safeNumber}.pdf`;

      const blob = await pdf(
        <ProfessionalQuotationPDF
          quotation={q}
          client={q.client}
          brandKit={brandKit}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF Generated",
        description: "Quotation downloaded successfully.",
      });
    } catch (err) {
      console.error(err);

      toast({
        title: "PDF Generation Failed",
        description: "Unable to generate quotation PDF.",
        variant: "destructive",
      });
    }
  };

  const stepLabel =
    step === 1
      ? "Basic Info"
      : step === 3
        ? "Service Details"
        : "Review";

  const stepIndex = step === 1 ? 1 : step === 3 ? 2 : 3;

  const previewQuotation = step === 5 ? buildPreviewQuotation() : null;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col gap-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 animate-fade-in">
      <AlertDialog open={draftConflictOpen} onOpenChange={setDraftConflictOpen}>
      </AlertDialog>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link to="/quotations" className="shrink-0">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground truncate">New Quotation</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Step {stepIndex} of 3 — {stepLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">

          <Button
            variant="outline"
            onClick={() => handleSaveDraft("draft")}
            className="rounded-xl"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>

          {step > 1 && (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={goBack}
              disabled={resuming}
            >
              Back
            </Button>
          )}

          {step < 5 && (
            <Button
              className="rounded-xl"
              onClick={goNext}
              disabled={resuming}
            >
              Next
            </Button>
          )}

        </div>
      </div>

      {/* Step content */}
      {step === 1 ? (
        <>
          <Step1BasicInfo
            formData={formData}
            setFormData={setFormData}
            titleError={titleError}
            setTitleError={setTitleError}
            titleSuggestions={titleSuggestions}
            quotations={quotations}
            draftId={draftId}
            clients={clients}
            filteredClientsForSelect={filteredClientsForSelect}
            clientSelectOpen={clientSelectOpen}
            setClientSelectOpen={setClientSelectOpen}
            clientSearchQuery={clientSearchQuery}
            setClientSearchQuery={setClientSearchQuery}
            openAddClientDialog={openAddClientDialog}
          />
          {/* ===== Services Selection ===== */}


          <Step2ServicesAndPricing
            services={services}
            categoriesInUse={categoriesInUse}

            categoryChipFilter={categoryChipFilter}
            setCategoryChipFilter={setCategoryChipFilter}

            showAllCategoryChips={showAllCategoryChips}
            setShowAllCategoryChips={setShowAllCategoryChips}

            groupedFilteredServices={groupedFilteredServices}

            openCategories={openCategories}
            toggleCategory={toggleCategory}

            serviceBlocks={serviceBlocks}
            addOrRemoveServiceAsBlock={addOrRemoveServiceAsBlock}
            updateBlock={updateBlock}

            rightColumnRef={rightColumnRef}
            rightColumnHeight={rightColumnHeight}

            currency={currency}

            derivedTotals={derivedTotals}

            discountAmount={discountAmount}

            finalTotal={finalTotal}

            serviceSearch={serviceSearch}
          />
        </>
      ) : null
      }
      {/* Step content */}

      {
        step === 3 ? (
          <Step3ServiceDetails
            serviceBlocks={serviceBlocks}
            updateBlock={updateBlock}
            goBack={goBack}
          />
        ) : null
      }


      {step === 3 && (
        <div className="flex flex-wrap justify-between items-center gap-3 mt-2">

          <Button
            variant="outline"
            onClick={() => handleSaveDraft("draft")}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>

          <div className="flex gap-3">
            <Button variant="outline" onClick={goBack}>
              Back
            </Button>

            <Button onClick={goNext}>
              Next
            </Button>
          </div>

        </div>
      )}

      {
        step === 5 && (() => {
          const pq = previewQuotation ?? buildPreviewQuotation();
          if (!pq) return null;
          return (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_clamp(280px,28vw,360px)] gap-6 w-full max-w-[1320px] mx-auto">
              <div className="min-w-0">
                {/* <QuotationLayout quotation={pq} brandKit={brandKit} mode="screen" /> */}
                <ProfessionalQuotationLayout quotation={pq} brandKit={brandKit} />
              </div>

              <aside className="no-print lg:sticky lg:top-6 h-fit min-w-0">
                <div className="glass-card p-6 space-y-4">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Review</p>
                    <p className="font-heading font-bold text-xl text-foreground mt-1 truncate">{pq.client?.business_name || pq.client?.name || "Client"}</p>
                    <p className="text-sm text-muted-foreground mt-1 truncate">{pq.title || "Quotation"}</p>
                  </div>
                  <div className="border-t border-border/50 pt-4 space-y-2">
                    {derivedTotals.monthly > 0 ? (
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">Monthly total</span>
                        <span className="text-foreground font-medium">{(currency === "INR" ? "₹" : "$")}{derivedTotals.monthly.toLocaleString()}</span>
                      </div>
                    ) : null}
                    {derivedTotals.one_time > 0 ? (
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">One-time total</span>
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
                      <span className="font-heading font-semibold text-foreground">Total</span>
                      <span className="font-heading font-bold text-2xl text-foreground">{(currency === "INR" ? "₹" : "$")}{finalTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button variant="outline" className="w-full gap-2 rounded-xl border border-black" onClick={goBack}>
                      <Pencil className="w-4 h-4" /> Edit Quotation
                    </Button>

                    <Button
                      className="w-full rounded-xl gap-2 bg-black border border-black"
                      onClick={handleMarkSent}
                      disabled={markingSent}
                    >
                      {markingSent ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Mark as Sent
                    </Button>
                    <Button variant="outline" className="w-full gap-2 rounded-xl border border-black" onClick={() => handleSaveDraft("draft")}>
                      <Save className="w-4 h-4" /> Save Draft
                    </Button>
                    <Button
                      className="w-full rounded-xl gap-2 bg-black border border-black"
                      onClick={handleMarkSent}
                      disabled={markingSent}
                    >
                      {markingSent ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Share Quotation Link
                    </Button>

                    <Button variant="outline" className="w-full gap-2 rounded-xl border border-black" onClick={handleDownloadPdf}>
                      <Download className="w-4 h-4" /> Generate PDF
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Quotation is not saved automatically.

                    Click "Save Draft" to save your progress.

                    Your draft will reopen from the same step.
                  </p>
                </div>

              </aside>
            </div >
          );
        })()
      }

      <AddClientDialog
        open={isAddClientOpen}
        onOpenChange={setIsAddClientOpen}
        onClientCreated={(clientId) => {
          setFormData((p) => ({ ...p, client_id: clientId }));
        }}
      />
    </div >

  )
}