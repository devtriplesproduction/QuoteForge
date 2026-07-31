
// //QuotationBuilder.tsx

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { Link, useSearchParams } from "react-router-dom";
// import { ArrowLeft, Download, Pencil, Save, Send, UserPlus, X, FileText, ListChecks, Package, Clock, Wallet, ScrollText, ChevronRight, Users, Calendar as CalendarIcon, Tag, ChevronDown, Loader2 } from "lucide-react";
// import { pdf } from "@react-pdf/renderer";
// import Step1BasicInfo from "@/components/quotation/Step1BasicInfo";
// import Step2ServicesAndPricing from "@/components/quotation/Step2ServicesAndPricing";
// import Step3ServiceDetails from "@/components/quotation/Step3ServiceDetails";
// import {
//   generateMilestones,
//   updateMilestonePercentage,
//   calculateMilestoneTotal,
//   calculateRemainingPercentage,
//   updateMilestoneLabel,
//   calculateTotalPercentage,
//   createMilestone,
//   isMilestonePlanValid,
//   normalizeMilestonesFromTemplate, // add this
// } from "@/components/quotation/milestoneCal";

// import {
//   DEFAULT_INTRODUCTION,
//   DEFAULT_SCOPE,
//   DEFAULT_PAYMENT_TERMS,
//   DEFAULT_TERMS_CONDITIONS,
// } from "@/lib/quotationDefaults";

// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Switch } from "@/components/ui/switch";
// import { DatePicker } from "@/pages/DatePicker";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { useApp } from "@/contexts/AppContext";
// import { useToast } from "@/hooks/use-toast";
// import AddClientDialog from "@/components/clients/AddClientDialog";
// import { RichEditor } from "@/components/ui/RichText";
// import type { PricingModel, Quotation, QuotationSectionToggles } from "@/lib/types";
// import { nowIso } from "@/lib/dates";
// // import { QuotationLayout } from "@/components/quotation/QuotationLayout";
// import ProfessionalQuotationLayout from "@/components/quotation/ProfessionalQuotationLayout";
// import ProfessionalQuotationPDF from "@/components/quotation/ProfessionalQuotationPDF";
// import {
//   getQuotationServiceBlocks,
//   getServiceBlockTotals,
//   type QuotationServiceBlock,
//   type QuotationServiceBlockBillingType,
// } from "@/lib/quotationServiceBlocks";
// import { calculateMonthly } from "@/components/quotation/pricing";
// import ServiceConfigurator from "@/components/service-configurator/ServiceConfigurator";
// import { getServiceConfig } from "@/lib/service-configs";
// import type { ServiceConfigState } from "@/lib/pricing-engine";



// // const monthly = calculateMonthly(
// //   block.price,
// //   block.durationMonths
// // );

// type BuilderStep = 1 | 2 | 3 | 4 | 5;

// function n(v: unknown): number {
//   const x = Number(v);
//   return Number.isFinite(x) ? x : 0;
// }

// function dedupeTitles(list: string[]): string[] {
//   const out: string[] = [];
//   const seen = new Set<string>();
//   for (const t of list) {
//     const s = String(t || "").trim();
//     if (!s) continue;
//     const key = s.toLowerCase();
//     if (seen.has(key)) continue;
//     seen.add(key);
//     out.push(s);
//   }
//   return out;
// }

// function getCategoryTermsText(
//   termsConditions: { category: string; clause: string; is_general: boolean | number; sort_order: number }[],
//   category: string | undefined
// ): string {
//   if (!termsConditions?.length || !category) return "";

//   const rows = termsConditions
//     .filter(
//       (t) =>
//         !Number(t.is_general) &&
//         t.category?.toLowerCase() === category.toLowerCase()
//     )
//     .sort((a, b) => a.sort_order - b.sort_order);

//   if (!rows.length) return "";

//   return rows.map((t) => `• ${t.clause}`).join("\n");
// }

// export default function QuotationBuilder() {
//   // const navigate = useNavigate();
//   const [searchParams, setSearchParams] = useSearchParams();
//   const { toast } = useToast();

//   const {
//     clients,
//     services,
//     termsConditions,
//     quotations,
//     addQuotation,
//     updateQuotation,
//     deleteQuotation,
//     refreshQuotations,
//     getQuotationById,
//     currency,
//     brandKit,
//   } = useApp();
//   const serviceLibraryById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

//   const categoriesInUse = useMemo(
//     () => Array.from(new Set(services.map((s) => s.category).filter(Boolean))) as string[],
//     [services]
//   );

//   const today = new Date().toISOString().split("T")[0];
//   const defaultValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

//   const DRAFT_LS_KEY = "currentDraftId";
//   const draftIdParam = searchParams.get("draftId");
//   const [titleError, setTitleError] = useState("");

//   const rightColumnRef = useRef<HTMLDivElement>(null);
//   const [rightColumnHeight, setRightColumnHeight] = useState<number | null>(null);
//   const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

//   const toggleCategory = (category: string) => {
//     setOpenCategories((prev) => {
//       const next = new Set(prev);
//       if (next.has(category)) {
//         next.delete(category);
//       } else {
//         next.add(category);
//       }
//       return next;
//     });
//   };

//   // Never auto-resume from localStorage — only resume via explicit URL param
//   // This prevents old quotations from being overwritten when creating new ones
//   const [draftId, setDraftId] = useState<string | null>(draftIdParam ?? null);

//   const DEFAULT_SECTION_TOGGLES = useMemo<QuotationSectionToggles>(
//     () => ({
//       introduction: true,
//       scope_of_work: true,
//       payment_terms: true,
//       terms_conditions: true,
//     }),
//     [],
//   );

//   const [step, setStep] = useState<BuilderStep>(1);
//   const [serviceSearch, setServiceSearch] = useState("");
//   const [categoryChipFilter, setCategoryChipFilter] = useState<string>("all");
//   const [showAllCategoryChips, setShowAllCategoryChips] = useState(false);

//   // STEP 1 — Basic Info (NO notes here)
//   const [formData, setFormData] = useState({
//     title: "",
//     client_id: "",
//     quote_date: today,
//     valid_until: defaultValidUntil,
//   });

//   // STEP 2-3 — Service Blocks (source of truth)
//   const [serviceBlocks, setServiceBlocks] = useState<QuotationServiceBlock[]>([]);

//   const quotationTerms = useMemo(() => {
//     if (!termsConditions.length) return [];

//     // General Terms
//     const general = termsConditions.filter(
//       (t) => Number(t.is_general) === 1
//     );

//     // Unique categories of selected services
//     const selectedCategories = [
//       ...new Set(
//         serviceBlocks
//           .map((b) => {
//             const service = services.find((s) => s.id === b.service_id);
//             return service?.category;
//           })
//           .filter(Boolean)
//       ),
//     ];

//     // Category specific terms (max 3)
//     const categoryTerms = selectedCategories.flatMap((category) =>
//       termsConditions
//         .filter(
//           (t) =>
//             Number(t.is_general) === 0 &&
//             t.category === category
//         )
//         .slice(0, 3)
//     );

//     return [...general, ...categoryTerms];
//   }, [termsConditions, serviceBlocks, services]);




//   // Step 4 (Global Terms) has been removed.
//   // Introduction and the global payment-terms fallback are no longer
//   // collected — payment terms live per-service, and terms & conditions
//   // are assembled automatically (general + each selected service's terms).
//   const sectionToggles = DEFAULT_SECTION_TOGGLES;

//   const [resuming, setResuming] = useState(false);
//   const [markingSent, setMarkingSent] = useState(false);

//   // Draft conflict modal (preserve existing behavior)
//   const [draftConflictOpen, setDraftConflictOpen] = useState(false);
//   const [conflictDraftId, setConflictDraftId] = useState<string | null>(null);
//   const [conflictDraftIds, setConflictDraftIds] = useState<string[]>([]);
//   const conflictCheckedRef = useRef(false);
//   const conflictRefreshAttemptedRef = useRef(false);

//   const resumeHydratedRef = useRef<string | null>(null);
//   const resumeRefreshAttemptedRef = useRef<string | null>(null);

//   // Add Client Dialog
//   const [isAddClientOpen, setIsAddClientOpen] = useState(false);
//   const [clientSelectOpen, setClientSelectOpen] = useState(false);
//   const [clientSearchQuery, setClientSearchQuery] = useState("");

//   const titleSuggestions = useMemo(() => dedupeTitles((quotations || []).map((q) => q.title || "")).slice(0, 30), [quotations]);

//   const filteredClientsForSelect = useMemo(() => {
//     const q = clientSearchQuery.trim().toLowerCase();
//     if (!q) return clients;
//     return clients.filter((c) => {
//       const name = (c.name || "").toLowerCase();
//       const business = (c.business_name || "").toLowerCase();
//       return name.includes(q) || business.includes(q);
//     });
//   }, [clients, clientSearchQuery]);

//   const openAddClientDialog = useCallback(() => {
//     setClientSelectOpen(false);
//     // Radix Select can swallow the immediate open; defer to next tick.
//     setTimeout(() => setIsAddClientOpen(true), 0);
//   }, []);

//   const resetToFreshWizard = useCallback(() => {
//     resumeHydratedRef.current = null;
//     resumeRefreshAttemptedRef.current = null;

//     setDraftId(null);
//     setSearchParams((prev) => {
//       const next = new URLSearchParams(prev);
//       next.delete("draftId");
//       return next;
//     });
//     localStorage.removeItem(DRAFT_LS_KEY);

//     setStep(1);
//     setFormData({ title: "", client_id: "", quote_date: today, valid_until: defaultValidUntil });
//     setServiceBlocks([]);
//   }, [defaultValidUntil, setSearchParams, today]);

//   // Cross-tab sync: if currentDraftId changes elsewhere, reflect it here.
//   useEffect(() => {
//     const onStorage = (e: StorageEvent) => {
//       if (e.key !== DRAFT_LS_KEY) return;

//       const nextId = e.newValue;
//       if (!nextId) {
//         resetToFreshWizard();
//         return;
//       }

//       if (nextId !== draftId) {
//         resumeHydratedRef.current = null;
//         resumeRefreshAttemptedRef.current = null;
//         setDraftId(nextId);
//         setSearchParams({ draftId: nextId });
//       }
//     };

//     window.addEventListener("storage", onStorage);
//     return () => window.removeEventListener("storage", onStorage);
//   }, [draftId, resetToFreshWizard, setSearchParams]);

//   // If user clicked "New Quotation" while an unfinished draft exists, prompt for action.
//   useEffect(() => {
//     if (draftIdParam) return; // explicit resume via URL
//     if (draftId) return; // resuming via stored pointer
//     if (conflictCheckedRef.current) return;

//     // Refresh exactly once, then decide based on current state.
//     if (!conflictRefreshAttemptedRef.current) {
//       conflictRefreshAttemptedRef.current = true;
//       refreshQuotations().catch((err) => {
//         if (import.meta.env.DEV) console.error("Failed to refresh quotations", err);
//       });
//       return;
//     }

//     conflictCheckedRef.current = true;

//     const activeDrafts = quotations
//       .filter((q) => q.status === "draft" && !q.is_template)
//       .filter((q) => !q.sent_at && !q.accepted_at && !q.invoiced_at);

//     if (activeDrafts.length === 0) {
//       localStorage.removeItem(DRAFT_LS_KEY);
//       return;
//     }

//     const byUpdatedAtDesc = activeDrafts
//       .slice()
//       .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));

//     const preferred = byUpdatedAtDesc[0];
//     if (!preferred) return;

//     setConflictDraftIds(byUpdatedAtDesc.map((d) => d.id));
//     setConflictDraftId(preferred.id);
//     setDraftConflictOpen(true);
//   }, [draftId, draftIdParam, quotations, refreshQuotations]);

//   useEffect(() => {
//     const el = rightColumnRef.current;
//     if (!el) return;

//     const update = () => setRightColumnHeight(el.offsetHeight);
//     update();

//     const observer = new ResizeObserver(update);
//     observer.observe(el);

//     return () => observer.disconnect();
//   }, [serviceBlocks]); // re-measure whenever selections change (Pricing card grows/shrinks)

//   const handleContinuePrevious = () => {
//     if (!conflictDraftId) return;
//     setDraftConflictOpen(false);
//     localStorage.setItem(DRAFT_LS_KEY, conflictDraftId);
//     resumeHydratedRef.current = null;
//     resumeRefreshAttemptedRef.current = null;
//     setDraftId(conflictDraftId);
//     setSearchParams({ draftId: conflictDraftId });
//   };

//   const startNewInProgressRef = useRef(false);
//   const handleStartNew = async () => {
//     if (startNewInProgressRef.current) return;
//     startNewInProgressRef.current = true;

//     const idsToDelete = conflictDraftIds.length > 0 ? conflictDraftIds : conflictDraftId ? [conflictDraftId] : [];

//     try {
//       await Promise.all(idsToDelete.map((id) => deleteQuotation(id)));
//       await refreshQuotations();

//       localStorage.removeItem(DRAFT_LS_KEY);
//       setSearchParams((prev) => {
//         const next = new URLSearchParams(prev);
//         next.delete("draftId");
//         return next;
//       });
//       setDraftId(null);

//       setDraftConflictOpen(false);

//       // Reset UI state
//       setStep(1);
//       setFormData({ title: "", client_id: "", quote_date: today, valid_until: defaultValidUntil });
//       setServiceBlocks([]);

//     } catch (err) {
//       if (import.meta.env.DEV) console.error("Failed to start a new quotation", err);
//       toast({
//         title: "Could not start a new quotation",
//         description: "We couldn't reset your draft. Please try again.",
//         variant: "destructive",
//       });
//     } finally {
//       startNewInProgressRef.current = false;
//     }
//   };

//   // Resume draft (URL param or stored pointer)
//   useEffect(() => {
//     if (!draftId) return;
//     if (resumeHydratedRef.current === draftId) return;

//     const q = getQuotationById(draftId) ?? quotations.find((x) => x.id === draftId);

//     if (!q) {
//       if (resumeRefreshAttemptedRef.current !== draftId) {
//         resumeRefreshAttemptedRef.current = draftId;
//         setResuming(true);
//         refreshQuotations().finally(() => {
//           setResuming(false);
//         });
//         return;
//       }

//       localStorage.removeItem(DRAFT_LS_KEY);
//       setSearchParams((prev) => {
//         const next = new URLSearchParams(prev);
//         next.delete("draftId");
//         return next;
//       });
//       setDraftId(null);
//       return;
//     }

//     resumeHydratedRef.current = draftId;

//     // Always resume at Step 1 for predictable UX.
//     // setStep(1);

//     setStep(((q as any).current_step || 1) as BuilderStep);

//     setFormData({
//       title: q.title || "",
//       client_id: q.client_id || "",
//       quote_date: q.quote_date || today,
//       valid_until: q.valid_until || defaultValidUntil,
//     });

//     // Source of truth: service_blocks. If missing, fall back to legacy line-items.

//     // Source of truth: service_blocks. If missing, fall back to legacy line-items.
//     const blocksUnknown = (q as unknown as { service_blocks?: unknown }).service_blocks;
//     if (Array.isArray(blocksUnknown) && blocksUnknown.length > 0) {
//       setServiceBlocks(
//         getQuotationServiceBlocks(q).map((b) => {

//           const lib = serviceLibraryById.get(b.service_id);

//           return {

//             ...b,

//             // ---------- Repair Monthly Amount ----------
//             monthly_amount:
//               b.billing_type === "monthly"
//                 ? (
//                   b.monthly_amount ??
//                   calculateMonthly(
//                     Number(b.price || 0),
//                     Number(b.duration_months || 1)
//                   ).monthlyAmount
//                 )
//                 : b.monthly_amount,

//             // ---------- Repair Missing Fields ----------
//             description:
//               b.description || lib?.description || "",

//             scope_of_work:
//               b.scope_of_work || lib?.scope_of_work || "",

//             deliverables:
//               b.deliverables || lib?.deliverables || "",

//             timeline:
//               b.timeline || lib?.timeline || "",

//             payment_terms:
//               b.payment_terms || lib?.payment_terms || "",

//             service_terms:
//               b.service_terms || lib?.service_terms || "",

//             terms_conditions_text:
//               b.terms_conditions_text ||
//               getCategoryTermsText(termsConditions, b.category || lib?.category || ""),

//           };

//         })
//       );
//     } else if ((q.services || []).length > 0) {
//       setServiceBlocks(
//         (q.services || []).map((it) => {
//           const lib = serviceLibraryById.get(it.service_id || "");
//           return {
//             service_id: String(it.service_id || "default"),
//             service_name: String(it.service_name || "Service"),
//             description: String(it.description || lib?.description || ""),
//             scope_of_work: String(lib?.scope_of_work || ""),
//             deliverables: String(lib?.deliverables || ""),
//             timeline: String(lib?.timeline || ""),
//             price: n(it.total),
//             billing_type: (
//               (it as any).billing_type || "one_time"
//             ) as QuotationServiceBlockBillingType,
//             payment_terms: String(lib?.payment_terms || ""),
//             service_terms: String(lib?.service_terms || ""),
//           };
//         }),
//       );
//     } else {
//       setServiceBlocks([]);
//     }

//     setSearchParams({ draftId });
//   }, [
//     DEFAULT_SECTION_TOGGLES,
//     defaultValidUntil,
//     draftId,
//     getQuotationById,
//     quotations,
//     refreshQuotations,
//     setSearchParams,
//     today,
//     serviceLibraryById,
//   ]);

//   // Create a draft immediately if we don't have one (required for Step 1 autosave)

//   // Draft will only be created when the user clicks "Save to Draft".

//   const validateStep1 = () => {
//     if (!formData.title.trim()) {
//       toast({ title: "Missing title", description: "Please enter a quotation title", variant: "destructive" });
//       return false;
//     }
//     const duplicate = quotations.find(
//       q =>
//         q.title.trim().toLowerCase() ===
//         formData.title.trim().toLowerCase() &&
//         q.id !== draftId
//     );

//     if (duplicate) {
//       toast({
//         title: "Duplicate quotation title",
//         description: "A quotation with this title already exists.",
//         variant: "destructive",
//       });

//       return false;
//     }
//     if (!formData.client_id) {
//       toast({ title: "Missing client", description: "Please select a client", variant: "destructive" });
//       return false;
//     }
//     if (!formData.quote_date || !formData.valid_until) {
//       toast({ title: "Missing dates", description: "Please select quotation dates", variant: "destructive" });
//       return false;
//     }
//     return true;
//   };


//   const derivedTotals = useMemo(() => getServiceBlockTotals(serviceBlocks), [serviceBlocks]);

//   // Each service block now carries its own `discount_amount` (a flat currency
//   // amount, not a percent) — set per-service in the Pricing card. The total
//   // discount is just the sum of every service's discount.
//   const discountAmount = useMemo(
//     () => serviceBlocks.reduce((sum, b) => sum + Number((b as any).discount_amount || 0), 0),
//     [serviceBlocks]
//   );

//   const finalTotal = useMemo(
//     () => Math.max(0, derivedTotals.total - discountAmount),
//     [derivedTotals.total, discountAmount]
//   );

//   const autoGeneratedTerms = useMemo(() => {
//     if (!termsConditions?.length) return "";

//     // Get unique categories from selected services
//     const selectedCategories = [
//       ...new Set(
//         serviceBlocks
//           .map((s) => s.category)
//           .filter(Boolean)
//       ),
//     ];

//     // General terms
//     const generalTerms = termsConditions
//       .filter((t) => t.is_general)
//       .sort((a, b) => a.sort_order - b.sort_order);

//     // Category terms
//     const categoryTerms = selectedCategories.flatMap((category) => {
//       const rows = termsConditions
//         .filter(
//           (t) =>
//             !t.is_general &&
//             t.category?.toLowerCase() === category?.toLowerCase()
//         )
//         .sort((a, b) => a.sort_order - b.sort_order);



//       if (!rows.length) return [];

//       return [
//         {
//           heading: category,
//         },
//         ...rows,
//       ];
//     });

//     let text = "GENERAL TERMS\n\n";

//     generalTerms.forEach((t, index) => {
//       text += `${index + 1}. ${t.clause}\n`;
//     });

//     categoryTerms.forEach((item) => {
//       if ("heading" in item) {
//         text += `\n\n${item.heading.toUpperCase()}\n\n`;
//       } else {
//         text += `• ${item.clause}\n`;
//       }
//     });

//     console.log(text);
//     return text;

//   }, [serviceBlocks, termsConditions]);

//   const autoGeneratedPaymentTerms = useMemo(() => {
//     const withTerms = serviceBlocks.filter((b) => (b.payment_terms || "").trim());
//     if (!withTerms.length) return "";

//     if (withTerms.length === 1) {
//       return withTerms[0].payment_terms || "";
//     }

//     return withTerms
//       .map((b) => `${(b.service_name || "Service").toUpperCase()}\n\n${b.payment_terms}`)
//       .join("\n\n\n");
//   }, [serviceBlocks]);

//   const filteredServices = useMemo(() => {
//     return services.filter((service) => {
//       if (!service.is_active) return false;
//       if (categoryChipFilter !== "all" && service.category !== categoryChipFilter) return false;
//       return true;
//     });
//   }, [services, categoryChipFilter]);

//   const groupedFilteredServices = useMemo(() => {
//     const groups: Record<string, typeof filteredServices> = {};
//     filteredServices.forEach((service) => {
//       const cat = service.category || "Other";
//       if (!groups[cat]) groups[cat] = [];
//       groups[cat].push(service);
//     });
//     return groups;
//   }, [filteredServices]);

//   const persistDraft = useCallback(
//     async (
//       partial: Partial<Quotation>,
//       quotationId?: string
//     ) => {

//       const id = quotationId ?? draftId;

//       if (!id) return;

//       const q = getQuotationById(id);
//       if (!q) return;

//       // Keep legacy quotation.services in sync for compatibility (DO NOT remove).
//       const legacyServices = serviceBlocks.map((b, idx) => {
//         const lib = serviceLibraryById.get(b.service_id);
//         const pricing_model = (lib?.pricing_model || "fixed") as PricingModel;

//         return {
//           id: `${id}-${b.service_id}-${idx}`,
//           quotation_id: id,
//           service_id: b.service_id,
//           service_name: b.service_name,
//           description: b.description || null,
//           pricing_model,
//           quantity: 1,
//           unit_price: n(b.price),
//           total: n(b.price),
//           is_included: true,
//           custom_notes: null,
//           sort_order: idx,
//           created_at: q.created_at,
//         };
//       });

//       const updated: Quotation = {
//         ...q,
//         ...partial,
//         title: partial.title ?? q.title,
//         client_id: partial.client_id ?? q.client_id,
//         quote_date: partial.quote_date ?? q.quote_date,
//         valid_until: partial.valid_until ?? q.valid_until,
//         section_toggles: partial.section_toggles ?? q.section_toggles,
//         introduction: partial.introduction ?? q.introduction,
//         payment_terms_text: DEFAULT_PAYMENT_TERMS,
//         terms_conditions_text: partial.terms_conditions_text ?? q.terms_conditions_text,
//         current_step:
//           partial.current_step ??
//           q.current_step,
//         service_blocks: partial.service_blocks !== undefined ? partial.service_blocks : serviceBlocks,
//         services: partial.services ?? legacyServices,
//         subtotal: partial.subtotal ?? derivedTotals.total,
//         discount: partial.discount ?? discountAmount,
//         discount_type: partial.discount_type ?? "fixed",
//         total: partial.total ?? finalTotal,
//         updated_at: nowIso(),
//       } as Quotation;

//       await updateQuotation(updated);
//     },
//     [derivedTotals.total, discountAmount, draftId, finalTotal, getQuotationById, serviceBlocks, serviceLibraryById, updateQuotation, autoGeneratedPaymentTerms,],
//   );

//   const addOrRemoveServiceAsBlock = (serviceId: string, checked: boolean) => {
//     const lib = serviceLibraryById.get(serviceId);
//     if (!lib) return;
//     console.log("Selected Service Object:", lib);
//     console.log("Base Price:", lib?.base_price);
//     console.log("MILESTONE TEMPLATE", lib.milestone_template);

//     setServiceBlocks((prev) => {
//       if (checked) {
//         if (prev.some((b) => b.service_id === serviceId)) return prev;

//         // Parse the library's predefined milestone template once
//         const rawTemplate =
//           lib.billing_type === "milestone"
//             ? typeof lib.milestone_template === "string"
//               ? JSON.parse(lib.milestone_template)
//               : lib.milestone_template || []
//             : [];

//         const price =
//           lib.billing_type === "milestone"
//             ? rawTemplate.length > 0
//               ? rawTemplate.reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0)
//               : Number(lib.base_price)
//             : Number(lib.base_price);

//         return [

//           {
//             service_id: lib.id,
//             service_name: lib.name,
//             description: String(lib.description || ""),
//             category: String(lib.category || ""),
//             subcategory: String(("subcategory" in lib ? (lib as { subcategory?: string | null }).subcategory : "") || ""),
//             scope_of_work: String(lib.scope_of_work || ""),
//             deliverables: String(lib.deliverables || ""),
//             timeline: String(lib.timeline || ""),
//             terms_conditions_text: getCategoryTermsText(termsConditions, String(lib.category || "")),
//             price,
//             billing_type: (
//               lib.billing_type === "one_time" ||
//                 lib.billing_type === "monthly" ||
//                 lib.billing_type === "milestone" ||
//                 lib.billing_type === "retainer"
//                 ? lib.billing_type
//                 : "one_time"
//             ) as QuotationServiceBlockBillingType,

//             duration_months: (() => {
//               const months =
//                 ("duration_months" in lib
//                   ? (lib as { duration_months?: number | null }).duration_months
//                   : null) ?? 1;
//               return Number(months) || 1;
//             })(),

//             monthly_amount:
//               lib.billing_type === "monthly"
//                 ? calculateMonthly(
//                   Number(lib.base_price),
//                   Number(
//                     ("duration_months" in lib
//                       ? (lib as { duration_months?: number | null }).duration_months
//                       : 1) || 1
//                   )
//                 ).monthlyAmount
//                 : undefined,

//             payment_terms: String(("payment_terms" in lib ? (lib as { payment_terms?: string | null }).payment_terms : "") || ""),
//             service_terms: String(lib.service_terms || ""),

//             // 🔧 normalized instead of raw copy
//             milestone_template:
//               lib.billing_type === "milestone"
//                 ? normalizeMilestonesFromTemplate(rawTemplate, price)
//                 : [],

//             // 🔧 count now matches the actual number of predefined milestones
//             milestone_count:
//               lib.billing_type === "milestone" && rawTemplate.length > 0
//                 ? rawTemplate.length
//                 : undefined,
//           },
//           ...prev,
//         ];
//       }
//       return prev.filter((b) => b.service_id !== serviceId);
//     });
//   };

//   const updateBlock = (idx: number, patch: Partial<QuotationServiceBlock>) => {
//     setServiceBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
//   };

//   const goNext = async () => {
//     if (step === 1) {
//       if (!validateStep1()) return;

//       for (const block of serviceBlocks) {
//         if (block.billing_type !== "milestone") continue;

//         const milestones = block.milestone_template ?? [];

//         if (milestones.length === 0) {
//           toast({
//             title: "Milestones Required",
//             description: `Please create milestones for "${block.service_name}".`,
//             variant: "destructive",
//           });
//           return;
//         }

//         const totalPercentage = calculateTotalPercentage(milestones);

//         if (totalPercentage !== 100) {
//           toast({
//             title: "Invalid Milestone Plan",
//             description: `Milestones for "${block.service_name}" must total exactly 100%.`,
//             variant: "destructive",
//           });
//           return;
//         }

//         if (calculateMilestoneTotal(milestones) !== block.price) {
//           toast({
//             title: "Milestone Amount Mismatch",
//             description: `Milestone amount must equal ₹${block.price}.`,
//             variant: "destructive",
//           });
//           return;
//         }
//       }

//       setStep(3);
//       return;
//     }
//     if (step === 3) {
//       setStep(5);
//       return;
//     }
//   };

//   const goBack = () => {
//     if (step === 1) return;
//     if (step === 3) {
//       setStep(1);
//       return;
//     }
//     if (step === 5) {
//       setStep(3);
//       return;
//     }
//   };



//   const buildPreviewQuotation = (): Quotation | null => {

//     if (!draftId) {
//       return {
//         id: "preview",
//         quotation_number: `QT-${Date.now()}`,

//         title: formData.title,
//         client_id: formData.client_id || null,

//         quote_date: formData.quote_date,
//         valid_until: formData.valid_until,

//         introduction: null,
//         scope_of_work: null,

//         payment_terms_text: DEFAULT_PAYMENT_TERMS,
//         terms_conditions_text: autoGeneratedTerms || null,
//         currency,

//         subtotal: derivedTotals.total,
//         total: finalTotal,
//         discount: discountAmount,
//         discount_type: "fixed",
//         tax_rate: 0,
//         tax_amount: 0,

//         status: "draft",

//         services: [],
//         service_blocks: serviceBlocks,

//         section_toggles: sectionToggles,

//         quotation_sections: null,
//         selected_points: null,

//         notes: null,

//         is_template: false,
//         template_name: null,

//         share_token: null,

//         sent_at: null,
//         accepted_at: null,
//         invoiced_at: null,

//         current_step: step,

//         created_at: new Date().toISOString(),
//         updated_at: new Date().toISOString(),

//         client: clients.find(c => c.id === formData.client_id),

//       } as unknown as Quotation;
//     }

//     const q =
//       getQuotationById(draftId) ||
//       quotations.find(x => x.id === draftId);

//     if (!q) {
//       console.log('Quotation Not found');
//       return {
//         id: draftId,
//         title: formData.title,
//         client_id: formData.client_id || null,
//         quote_date: formData.quote_date,
//         valid_until: formData.valid_until,
//         quotation_number: `QT-${draftId}`,
//         status: 'draft',
//         service_blocks: serviceBlocks,
//         services: [],
//         subtotal: derivedTotals.total,
//         total: derivedTotals.total,
//         discount: 0,
//         tax_rate: 0,
//         tax_amount: 0,
//         currency,
//         introduction: null,
//         payment_terms_text: DEFAULT_PAYMENT_TERMS,
//         terms_conditions_text: autoGeneratedTerms || null,
//         section_toggles: sectionToggles,
//         client: clients.find(c => c.id === formData.client_id),
//         created_at: new Date().toISOString(),
//         updated_at: new Date().toISOString(),
//       } as unknown as Quotation;
//     }

//     const currentClient =
//       clients.find(c => c.id === formData.client_id) || q.client;

//     return {
//       ...q,
//       title: formData.title,
//       client_id: formData.client_id || null,
//       quote_date: formData.quote_date,
//       valid_until: formData.valid_until,
//       introduction: null,
//       payment_terms_text: DEFAULT_PAYMENT_TERMS,
//       terms_conditions_text: autoGeneratedTerms || null,
//       section_toggles: sectionToggles,
//       service_blocks: serviceBlocks,
//       subtotal: derivedTotals.total,
//       total: derivedTotals.total,
//       client: currentClient,
//     } as Quotation;
//   };

//   const handleSaveDraft = async (
//     status: "draft" | "sent" = "draft"
//   ): Promise<string | null> => {

//     if (!validateStep1()) return null;
//     try {
//       // Update existing draft
//       if (draftId) {

//         await persistDraft({
//           status,
//           sent_at:
//             status === "sent"
//               ? new Date().toISOString()
//               : null,
//           current_step: step,
//         });

//         toast({
//           title: "Draft Updated",
//           description: `Quotation saved at Step ${step}.`,
//         });

//         return draftId;
//       }



//       // Create new draft
//       const createdId = await addQuotation({
//         quotation_number: `QT-${Date.now()}`,
//         title: formData.title,
//         client_id: formData.client_id || null,

//         quote_date: formData.quote_date,
//         valid_until: formData.valid_until,

//         introduction: null,

//         scope_of_work: null,

//         payment_terms_text: DEFAULT_PAYMENT_TERMS,

//         terms_conditions_text: autoGeneratedTerms || null,

//         currency,

//         subtotal: derivedTotals.total,

//         total: finalTotal,

//         discount: discountAmount,

//         discount_type: "fixed",

//         tax_rate: 0,

//         tax_amount: 0,

//         services: [],

//         service_blocks: serviceBlocks,

//         section_toggles: sectionToggles,

//         quotation_sections: null,

//         selected_points: null,

//         notes: null,

//         is_template: false,

//         template_name: null,

//         share_token: null,

//         status,

//         sent_at: status === "sent"
//           ? new Date().toISOString()
//           : null,

//         accepted_at: null,

//         invoiced_at: null,

//         current_step: step,
//       });

//       if (!createdId) {
//         throw new Error("Failed to create draft");
//       }

//       setDraftId(createdId);

//       localStorage.setItem(DRAFT_LS_KEY, createdId);

//       setSearchParams({ draftId: createdId });

//       toast({
//         title: "Draft Saved",
//         description: `Quotation saved at Step ${step}.`,
//       });

//       return createdId;

//     } catch (err) {
//       console.error(err);

//       toast({
//         title: "Error",
//         description: "Unable to save draft.",
//         variant: "destructive",
//       });

//       return null;
//     }
//   };

//   const handleMarkSent = async () => {

//     if (!validateStep1()) return;

//     setMarkingSent(true);

//     try {
//       let id = draftId;

//       if (!id) {

//         id = await handleSaveDraft("sent");

//         if (!id) return;

//       } else {

//         const now = new Date().toISOString();

//         await persistDraft(
//           {
//             status: "sent",
//             sent_at: now,
//             current_step: 5,
//           },
//           id
//         );
//       }

//       const publicUrl = `${window.location.origin}/public/quotation/${id}`;

//       try {

//         if (navigator.clipboard && window.isSecureContext) {

//           await navigator.clipboard.writeText(publicUrl);

//         } else {

//           const textArea = document.createElement("textarea");
//           textArea.value = publicUrl;
//           textArea.style.position = "fixed";
//           textArea.style.left = "-9999px";

//           document.body.appendChild(textArea);
//           textArea.focus();
//           textArea.select();

//           document.execCommand("copy");

//           document.body.removeChild(textArea);
//         }

//         toast({
//           title: "Quotation link copied",
//         });

//       } catch (err) {

//         console.error(err);

//         window.prompt("Copy quotation link:", publicUrl);

//       }

//       localStorage.removeItem(DRAFT_LS_KEY);
//     } finally {
//       setMarkingSent(false);
//     }
//   };

//   const handleDownloadPdf = async () => {
//     const q = buildPreviewQuotation();
//     if (!q) return;

//     try {
//       const { default: ProfessionalQuotationPDF } =
//         await import("@/components/quotation/ProfessionalQuotationPDF");

//       const clientName =
//         q.client?.business_name || q.client?.name || "Client";

//       const safeClientName = clientName
//         .replace(/[^a-zA-Z0-9-_ ]/g, "")
//         .trim();

//       const safeNumber = q.quotation_number.replace(
//         /[^a-zA-Z0-9-_]/g,
//         "_"
//       );

//       const fileName = `${safeClientName} - ${safeNumber}.pdf`;

//       const blob = await pdf(
//         <ProfessionalQuotationPDF
//           quotation={q}
//           client={q.client}
//           brandKit={brandKit}
//         />
//       ).toBlob();

//       const url = URL.createObjectURL(blob);

//       const link = document.createElement("a");
//       link.href = url;
//       link.download = fileName;

//       document.body.appendChild(link);
//       link.click();

//       document.body.removeChild(link);
//       URL.revokeObjectURL(url);

//       toast({
//         title: "PDF Generated",
//         description: "Quotation downloaded successfully.",
//       });
//     } catch (err) {
//       console.error(err);

//       toast({
//         title: "PDF Generation Failed",
//         description: "Unable to generate quotation PDF.",
//         variant: "destructive",
//       });
//     }
//   };

//   const stepLabel =
//     step === 1
//       ? "Basic Info"
//       : step === 3
//         ? "Service Details"
//         : "Review";

//   const stepIndex = step === 1 ? 1 : step === 3 ? 2 : 3;

//   const previewQuotation = step === 5 ? buildPreviewQuotation() : null;

//   return (
//     <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col gap-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 animate-fade-in">
//       <AlertDialog open={draftConflictOpen} onOpenChange={setDraftConflictOpen}>
//       </AlertDialog>

//       {/* Header */}
//       <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 sm:gap-6">
//         <div className="flex items-center gap-3 sm:gap-4 min-w-0">
//           <Link to="/quotations" className="shrink-0">
//             <Button variant="ghost" size="icon" className="rounded-xl">
//               <ArrowLeft className="w-5 h-5" />
//             </Button>
//           </Link>
//           <div className="min-w-0">
//             <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground truncate">New Quotation</h1>
//             <p className="text-muted-foreground mt-1 text-sm sm:text-base">Step {stepIndex} of 3 — {stepLabel}</p>
//           </div>
//         </div>

//         <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">

//           <Button
//             variant="outline"
//             onClick={() => handleSaveDraft("draft")}
//             className="rounded-xl"
//           >
//             <Save className="w-4 h-4 mr-2" />
//             Save Draft
//           </Button>

//           {step > 1 && (
//             <Button
//               variant="outline"
//               className="rounded-xl"
//               onClick={goBack}
//               disabled={resuming}
//             >
//               Back
//             </Button>
//           )}

//           {step < 5 && (
//             <Button
//               className="rounded-xl"
//               onClick={goNext}
//               disabled={resuming}
//             >
//               Next
//             </Button>
//           )}

//         </div>
//       </div>

//       {/* Step content */}
//       {step === 1 ? (
//         <>
//           <Step1BasicInfo
//             formData={formData}
//             setFormData={setFormData}
//             titleError={titleError}
//             setTitleError={setTitleError}
//             titleSuggestions={titleSuggestions}
//             quotations={quotations}
//             draftId={draftId}
//             clients={clients}
//             filteredClientsForSelect={filteredClientsForSelect}
//             clientSelectOpen={clientSelectOpen}
//             setClientSelectOpen={setClientSelectOpen}
//             clientSearchQuery={clientSearchQuery}
//             setClientSearchQuery={setClientSearchQuery}
//             openAddClientDialog={openAddClientDialog}
//           />
//           {/* ===== Services Selection ===== */}


//           <Step2ServicesAndPricing
//             services={services}
//             categoriesInUse={categoriesInUse}

//             categoryChipFilter={categoryChipFilter}
//             setCategoryChipFilter={setCategoryChipFilter}

//             showAllCategoryChips={showAllCategoryChips}
//             setShowAllCategoryChips={setShowAllCategoryChips}

//             groupedFilteredServices={groupedFilteredServices}

//             openCategories={openCategories}
//             toggleCategory={toggleCategory}

//             serviceBlocks={serviceBlocks}
//             addOrRemoveServiceAsBlock={addOrRemoveServiceAsBlock}
//             updateBlock={updateBlock}

//             rightColumnRef={rightColumnRef}
//             rightColumnHeight={rightColumnHeight}

//             currency={currency}

//             derivedTotals={derivedTotals}

//             discountAmount={discountAmount}

//             finalTotal={finalTotal}

//             serviceSearch={serviceSearch}
//           />
//         </>
//       ) : null
//       }
//       {/* Step content */}

//       {
//         step === 3 ? (
//           <Step3ServiceDetails
//             serviceBlocks={serviceBlocks}
//             updateBlock={updateBlock}
//             goBack={goBack}
//           />
//         ) : null
//       }


//       {step === 3 && (
//         <div className="flex flex-wrap justify-between items-center gap-3 mt-2">

//           <Button
//             variant="outline"
//             onClick={() => handleSaveDraft("draft")}
//           >
//             <Save className="w-4 h-4 mr-2" />
//             Save Draft
//           </Button>

//           <div className="flex gap-3">
//             <Button variant="outline" onClick={goBack}>
//               Back
//             </Button>

//             <Button onClick={goNext}>
//               Next
//             </Button>
//           </div>

//         </div>
//       )}

//       {
//         step === 5 && (() => {
//           const pq = previewQuotation ?? buildPreviewQuotation();
//           if (!pq) return null;
//           return (
//             <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_clamp(280px,28vw,360px)] gap-6 w-full max-w-[1320px] mx-auto">
//               <div className="min-w-0">
//                 {/* <QuotationLayout quotation={pq} brandKit={brandKit} mode="screen" /> */}
//                 <ProfessionalQuotationLayout quotation={pq} brandKit={brandKit} />
//               </div>

//               <aside className="no-print lg:sticky lg:top-6 h-fit min-w-0">
//                 <div className="glass-card p-6 space-y-4">
//                   <div className="min-w-0">
//                     <p className="text-xs uppercase tracking-wider text-muted-foreground">Review</p>
//                     <p className="font-heading font-bold text-xl text-foreground mt-1 truncate">{pq.client?.business_name || pq.client?.name || "Client"}</p>
//                     <p className="text-sm text-muted-foreground mt-1 truncate">{pq.title || "Quotation"}</p>
//                   </div>
//                   <div className="border-t border-border/50 pt-4 space-y-2">
//                     {derivedTotals.monthly > 0 ? (
//                       <div className="flex items-center justify-between gap-2 text-sm">
//                         <span className="text-muted-foreground">Monthly total</span>
//                         <span className="text-foreground font-medium">{(currency === "INR" ? "₹" : "$")}{derivedTotals.monthly.toLocaleString()}</span>
//                       </div>
//                     ) : null}
//                     {derivedTotals.one_time > 0 ? (
//                       <div className="flex items-center justify-between gap-2 text-sm">
//                         <span className="text-muted-foreground">One-time total</span>
//                         <span className="text-foreground font-medium">{(currency === "INR" ? "₹" : "$")}{derivedTotals.one_time.toLocaleString()}</span>
//                       </div>
//                     ) : null}
//                     <div className="flex items-center justify-between gap-2 text-sm pt-1">
//                       <span className="text-muted-foreground">Subtotal</span>
//                       <span className="text-foreground font-medium">{(currency === "INR" ? "₹" : "$")}{derivedTotals.total.toLocaleString()}</span>
//                     </div>
//                     {discountAmount > 0 ? (
//                       <div className="flex items-center justify-between gap-2 text-sm text-red-600">
//                         <span>Total discount</span>
//                         <span className="font-medium">-{(currency === "INR" ? "₹" : "$")}{discountAmount.toLocaleString()}</span>
//                       </div>
//                     ) : null}
//                     <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 mt-1">
//                       <span className="font-heading font-semibold text-foreground">Total</span>
//                       <span className="font-heading font-bold text-2xl text-foreground">{(currency === "INR" ? "₹" : "$")}{finalTotal.toLocaleString()}</span>
//                     </div>
//                   </div>

//                   <div className="space-y-2">
//                     <Button variant="outline" className="w-full gap-2 rounded-xl border border-black" onClick={goBack}>
//                       <Pencil className="w-4 h-4" /> Edit Quotation
//                     </Button>

//                     <Button
//                       className="w-full rounded-xl gap-2 bg-black border border-black"
//                       onClick={handleMarkSent}
//                       disabled={markingSent}
//                     >
//                       {markingSent ? (
//                         <Loader2 className="w-4 h-4 animate-spin" />
//                       ) : (
//                         <Send className="w-4 h-4" />
//                       )}
//                       Mark as Sent
//                     </Button>
//                     <Button variant="outline" className="w-full gap-2 rounded-xl border border-black" onClick={() => handleSaveDraft("draft")}>
//                       <Save className="w-4 h-4" /> Save Draft
//                     </Button>
//                     <Button
//                       className="w-full rounded-xl gap-2 bg-black border border-black"
//                       onClick={handleMarkSent}
//                       disabled={markingSent}
//                     >
//                       {markingSent ? (
//                         <Loader2 className="w-4 h-4 animate-spin" />
//                       ) : (
//                         <Send className="w-4 h-4" />
//                       )}
//                       Share Quotation Link
//                     </Button>

//                     <Button variant="outline" className="w-full gap-2 rounded-xl border border-black" onClick={handleDownloadPdf}>
//                       <Download className="w-4 h-4" /> Generate PDF
//                     </Button>
//                   </div>

//                   <p className="text-xs text-muted-foreground">
//                     Quotation is not saved automatically.

//                     Click "Save Draft" to save your progress.

//                     Your draft will reopen from the same step.
//                   </p>
//                 </div>

//               </aside>
//             </div >
//           );
//         })()
//       }

//       <AddClientDialog
//         open={isAddClientOpen}
//         onOpenChange={setIsAddClientOpen}
//         onClientCreated={(clientId) => {
//           setFormData((p) => ({ ...p, client_id: clientId }));
//         }}
//       />
//     </div >

//   )
// }


//QuotationBuilder.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, Pencil, Save, Send, UserPlus, X, FileText, ListChecks, Package, Clock, Wallet, ScrollText, ChevronRight, Users, Calendar as CalendarIcon, Tag, ChevronDown, Loader2 } from "lucide-react";
import { pdf } from "@react-pdf/renderer";



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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2 sm:mt-4">
            <div className="lg:col-span-2 space-y-6 min-w-0">
              <Card className="relative rounded-2xl border border-border/60 shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                {/* Thick left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-foreground" />

                <CardHeader className="pl-6 sm:pl-8 pb-5 border-b border-border/50">
                  <div className="flex items-baseline gap-4">
                    <span className="font-heading text-4xl font-bold text-foreground/10 leading-none select-none">
                      01
                    </span>
                    <CardTitle className="text-xl font-heading font-bold text-foreground leading-tight">
                      Basic Info
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="pl-6 sm:pl-8 space-y-7 pt-6">

                  {/* Quotation Title */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-foreground" strokeWidth={2.5} />
                      <Label className="text-xs uppercase tracking-wide text-foreground font-bold">
                        Quotation Title
                      </Label>
                    </div>
                    <Input
                      list="quotation-title-suggestions"
                      value={formData.title}
                      onChange={(e) => {
                        const value = e.target.value;

                        setFormData((p) => ({
                          ...p,
                          title: value,
                        }));

                        const duplicate = quotations.find(
                          (q) =>
                            q.title.trim().toLowerCase() === value.trim().toLowerCase() &&
                            q.id !== draftId
                        );

                        setTitleError(
                          duplicate ? "Duplicate quotation title" : ""
                        );
                      }}
                      className={`rounded-xl border-border/70 h-[42px] w-full ${titleError
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                        }`}
                      placeholder="e.g., Social Media Management Proposal"
                    />
                    {titleError && (
                      <p className="text-red-500 text-xs mt-1 ml-1">{titleError}</p>
                    )}
                    <datalist id="quotation-title-suggestions">
                      {titleSuggestions.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>

                  {/* Client */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-foreground" strokeWidth={2.5} />
                      <Label className="text-xs uppercase tracking-wide text-foreground font-bold">
                        Client
                      </Label>
                    </div>
                    <Select
                      open={clientSelectOpen}
                      onOpenChange={(open) => {
                        setClientSelectOpen(open);
                        if (!open) setClientSearchQuery("");
                      }}
                      value={formData.client_id || undefined}
                      onValueChange={(value) => setFormData((p) => ({ ...p, client_id: value }))}
                    >
                      <SelectTrigger className="rounded-xl border-border/70 h-[42px] w-full">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        <div
                          role="button"
                          tabIndex={0}
                          className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-primary outline-none focus:bg-accent  "
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openAddClientDialog();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              openAddClientDialog();
                            }
                          }}
                        >
                          <UserPlus className="w-4 h-4 scrollbar-modern" /> + Add New Client
                        </div>
                        <div className="h-px bg-muted my-1" />

                        {/* Search box — filters by client name AND business/company name,
                            since Radix's built-in typeahead only matches the start of an
                            item's visible label and can't search "inside" it. */}
                        <div className="px-1 pb-1.5 sticky top-0 bg-popover z-10">
                          <Input
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder="Search by name or company..."
                            className="h-8 rounded-lg text-sm"
                            autoFocus
                          />
                        </div>

                        {filteredClientsForSelect.length > 0 ? (
                          filteredClientsForSelect.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name} {client.business_name && `- ${client.business_name}`}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                            No clients match "{clientSearchQuery}"
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.5} />
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground font-bold">
                          Quotation Date
                        </Label>
                      </div>
                      <DatePicker
                        value={formData.quote_date}
                        onChange={(value) =>
                          setFormData((p) => ({
                            ...p,
                            quote_date: value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.5} />
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground font-bold">
                          Valid Until
                        </Label>
                      </div>
                      <DatePicker
                        value={formData.valid_until}
                        onChange={(value) =>
                          setFormData((p) => ({
                            ...p,
                            valid_until: value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="min-w-0">
              <Card className="relative lg:sticky lg:top-6 rounded-2xl border border-border/60 overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300">
                {/* Thick left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-foreground" />

                <CardHeader className="pl-6 sm:pl-8 pb-3 border-b border-border/50">
                  <CardTitle className="font-heading text-base font-bold text-foreground">Client Summary</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Information updates automatically when a client is selected.
                  </p>
                </CardHeader>

                <CardContent className="p-0">
                  {!formData.client_id || !clients.find((c) => c.id === formData.client_id) ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center text-center py-12 px-6 animate-in fade-in-20 duration-200">
                      <div className="w-24 h-24 mb-3 rounded-full bg-gray-100 flex items-center justify-center animate-in [animation-duration:5s] shadow-sm">
                        <img
                          src="/office-man.png"
                          alt="Person"
                          className="w-18 h-18 object-contain opacity-70 select-none pointer-events-none"
                          draggable={false}
                        />
                      </div>
                      <p className="text-sm font-semibold text-foreground">No Client Selected</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                        Select a client from the form to view their information here.
                      </p>
                    </div>
                  ) : (
                    (() => {
                      const selectedClient = clients.find(
                        (c) => c.id === formData.client_id
                      );

                      if (!selectedClient) return null;

                      return (
                        <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
                          {/* Name / Business */}
                          <div className="p-5 border-b border-border/50 bg-muted/30 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/10 transition-transform duration-300 hover:scale-105">
                                <span className="text-sm font-bold text-primary">
                                  {(selectedClient.name || "?").charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold font-heading truncate">
                                  {selectedClient.name || "—"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {selectedClient.business_name || "—"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Business Details */}
                          <div className="border-b border-border/50">
                            <div className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors duration-200 hover:bg-muted/40">
                              <span className="text-xs text-muted-foreground shrink-0">Business Type</span>
                              <span className="text-sm font-bold text-right truncate max-w-[60%]">
                                {selectedClient.business_type || "—"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors duration-200 hover:bg-muted/40">
                              <span className="text-xs text-muted-foreground shrink-0">Industry</span>
                              <span className="text-sm font-bold text-right truncate max-w-[60%]">
                                {selectedClient.industry || "—"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors duration-200 hover:bg-muted/40">
                              <span className="text-xs text-muted-foreground shrink-0">Location</span>
                              <span className="text-sm font-bold text-right truncate max-w-[60%]">
                                {selectedClient.location || selectedClient.location || "—"}
                              </span>
                            </div>
                          </div>

                          {/* Contact Details */}
                          <div className="border-b border-border/50">
                            <div className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors duration-200 hover:bg-muted/40">
                              <span className="text-xs text-muted-foreground shrink-0">Email</span>
                              <span className="text-sm font-bold text-right truncate max-w-[60%]">
                                {selectedClient.email || "—"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors duration-200 hover:bg-muted/40">
                              <span className="text-xs text-muted-foreground shrink-0">Phone</span>
                              <span className="text-sm font-bold text-right truncate max-w-[60%]">
                                {selectedClient.phone || "—"}
                              </span>
                            </div>
                          </div>

                          {/* Created */}
                          <div className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors duration-200 hover:bg-muted/40">
                            <span className="text-xs text-muted-foreground shrink-0">Created</span>
                            <span className="text-sm font-bold">
                              {selectedClient.created_at
                                ? new Date(selectedClient.created_at).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                                : "—"}
                            </span>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ===== Services Selection ===== */}
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
                        className="p-4 rounded-xl border border-black bg-[#e5e5e5] space-y-4 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]">

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
                                  onChange={(state, price) => applyPrice(price, state)}
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

                                {(b.milestone_template ?? []).map((m) => (

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
      ) : null
      }
      {/* Step content */}

      {
        step === 3 ? (
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
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,840px)_clamp(320px,26vw,400px)] gap-8 w-full max-w-[1320px] mx-auto justify-center">
              <div className="min-w-0 flex justify-center rounded-2xl bg-muted/30 p-4 sm:p-8">
                {/* <QuotationLayout quotation={pq} brandKit={brandKit} mode="screen" /> */}
                <div className="w-full shadow-lg rounded-sm overflow-hidden">
                  <ProfessionalQuotationLayout quotation={pq} brandKit={brandKit} />
                </div>
              </div>

              <aside className="no-print lg:sticky lg:top-6 h-fit min-w-0">
                <div className="glass-card p-6 sm:p-7 space-y-4">
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