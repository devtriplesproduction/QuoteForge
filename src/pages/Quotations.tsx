// import { useRef, useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { GenerateInvoiceModal } from '@/components/invoices/GenerateInvoiceModal';
// import InvoiceHistoryModal from '@/components/invoices/InvoiceHistoryModal';
// import {
//   Plus,
//   Search,
//   FileText,
//   MoreVertical,
//   Eye,
//   Edit2,
//   Copy,
//   Trash2,
//   Filter,
//   ArrowUpDown,
//   Calendar,
//   CreditCard,
//   CheckCircle,
//   Receipt,
//   RotateCcw,
//   CheckCircle2,
//   XCircle,
//   FilePlus2,
//   History,
//   MessageSquareText,
// } from 'lucide-react';

// import { Card, CardContent } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// import { Input } from '@/components/ui/input';
// import { Badge } from '@/components/ui/badge';
// import { NotificationBell } from "@/components/NotificationBell";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { useApp } from '@/contexts/AppContext';
// import { useToast } from '@/hooks/use-toast';
// import { Quotation } from '@/lib/types';
// import { getServiceInvoiceEligibility } from '@/lib/phase4Invoicing';
// import { string } from 'zod';

// const statusConfig = {
//   draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
//   sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
//   accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700' },
//   invoiced: { label: 'Invoiced', color: 'bg-purple-100 text-purple-700' },
//   declined: { label: 'Declined', color: 'bg-red-100 text-red-700' },
//   expired: { label: 'Expired', color: 'bg-gray-100 text-gray-600' },
// };

// export default function Quotations() {
//   const navigate = useNavigate();
//   const { quotations, deleteQuotation, addQuotation, updateQuotation, currency, refreshQuotations, refreshInvoices, refreshInvoiceItems, invoices, invoiceItems } = useApp();
//   const { toast } = useToast();
//   const [searchQuery, setSearchQuery] = useState('');
//   const [statusFilter, setStatusFilter] = useState<string>('all');
//   const [sortBy, setSortBy] = useState<string>('newest');

//   let filteredQuotations = quotations.filter(q => !q.is_template);

//   if (searchQuery) {
//     filteredQuotations = filteredQuotations.filter(q =>
//       q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       (q.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
//       (q.client?.business_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
//       q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase())
//     );
//   }

//   if (statusFilter !== 'all') {
//     filteredQuotations = filteredQuotations.filter(q => q.status === statusFilter);
//   }

//   filteredQuotations.sort((a, b) => {
//     if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
//     if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
//     if (sortBy === 'highest') return b.total - a.total;
//     if (sortBy === 'lowest') return a.total - b.total;
//     return 0;
//   });

//   const DRAFT_LS_KEY = 'currentDraftId';

//   const clearDraftPointersIfMatching = (id: string) => {
//     const currentDraftId = localStorage.getItem(DRAFT_LS_KEY);
//     if (currentDraftId !== id) return;

//     localStorage.removeItem(DRAFT_LS_KEY);

//     // If the current tab is in the builder for this draft, force a safe route.
//     // (We can't control other tabs' URLs, but clearing localStorage prevents resume there.)
//     const params = new URLSearchParams(window.location.search);
//     if (params.get('draftId') === id) {
//       params.delete('draftId');
//       navigate({ pathname: '/quotations', search: params.toString() ? `?${params.toString()}` : '' });
//     }
//   };

//   const handleDelete = async (id: string) => {
//     clearDraftPointersIfMatching(id);
//     await deleteQuotation(id);
//     toast({ title: "Quotation deleted", description: "The quotation has been removed." });
//   };

//   const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
//   const [invoiceQuotation, setInvoiceQuotation] = useState<Quotation | null>(null);

//   const [historyModalOpen, setHistoryModalOpen] = useState(false);
//   const [historyQuotation, setHistoryQuotation] = useState<Quotation | null>(null);

//   const [declineNoteOpen, setDeclineNoteOpen] = useState(false);
//   const [declineNoteQuotation, setDeclineNoteQuotation] = useState<Quotation | null>(null);

//   const duplicateInProgressRef = useRef(false);
//   const handleDuplicate = async (quotation: Quotation) => {
//     if (duplicateInProgressRef.current) return;
//     duplicateInProgressRef.current = true;
//     // Ensure the duplicated quotation becomes the ONLY active draft.
//     const activeDrafts = quotations
//       .filter((q) => q.status === 'draft' && !q.is_template)
//       .filter((q) => !q.sent_at && !q.accepted_at && !q.invoiced_at);

//     try {
//       await Promise.all(activeDrafts.map((d) => deleteQuotation(d.id)));

//       localStorage.removeItem(DRAFT_LS_KEY);

//       const duplicatedId = await addQuotation({
//         quotation_number: `QT-${Date.now().toString().slice(-6)}`,
//         title: `${quotation.title} (Copy)`,
//         client_id: quotation.client_id || null,
//         introduction: quotation.introduction || null,
//         scope_of_work: quotation.scope_of_work || null,
//         currency: quotation.currency,
//         subtotal: quotation.subtotal,
//         discount: quotation.discount,
//         discount_type: quotation.discount_type,
//         tax_rate: quotation.tax_rate,
//         tax_amount: quotation.tax_amount,
//         total: quotation.total,
//         quote_date: quotation.quote_date,
//         valid_until: quotation.valid_until,
//         status: 'draft',
//         sent_at: null,
//         accepted_at: null,
//         accepted_by: quotation.accepted_by ?? null,
//         invoiced_at: null,
//         is_template: false,
//         template_name: null,
//         notes: quotation.notes || null,
//         payment_terms_text: quotation.payment_terms_text || null,
//         terms_conditions_text: quotation.terms_conditions_text || null,
//         quotation_sections: quotation.quotation_sections || null,
//         section_toggles: quotation.section_toggles || undefined,
//         selected_points: quotation.selected_points || null,
//         services: quotation.services || [],
//         share_token: null,
//         wizard_step: 1,
//       });

//       if (!duplicatedId) {
//         toast({ title: 'Error', description: 'Failed to duplicate quotation.', variant: 'destructive' });
//         return;
//       }

//       localStorage.setItem(DRAFT_LS_KEY, duplicatedId);
//       navigate(`/quotations/new?draftId=${duplicatedId}`);
//       toast({ title: 'Quotation duplicated', description: 'A copy has been created as a draft.' });
//     } catch (err) {
//       if (import.meta.env.DEV) console.error('Failed to duplicate quotation', err);
//       toast({
//         title: 'Error',
//         description: 'Could not duplicate quotation. Please try again.',
//         variant: 'destructive',
//       });
//     } finally {
//       duplicateInProgressRef.current = false;
//     }
//   };

//   const handleSaveAsTemplate = async (quotation: Quotation) => {
//     await addQuotation({
//       quotation_number: quotation.quotation_number,
//       title: quotation.title,
//       client_id: quotation.client_id || null,
//       introduction: quotation.introduction || null,
//       scope_of_work: quotation.scope_of_work || null,
//       currency: quotation.currency,
//       subtotal: quotation.subtotal,
//       discount: quotation.discount,
//       discount_type: quotation.discount_type,
//       tax_rate: quotation.tax_rate,
//       tax_amount: quotation.tax_amount,
//       total: quotation.total,
//       quote_date: quotation.quote_date,
//       valid_until: quotation.valid_until,
//       status: quotation.status,
//       sent_at: quotation.sent_at,
//       accepted_at: quotation.accepted_at,
//       invoiced_at: quotation.invoiced_at,
//       is_template: true,
//       template_name: quotation.title,
//       notes: quotation.notes || null,
//       payment_terms_text: quotation.payment_terms_text || null,
//       terms_conditions_text: quotation.terms_conditions_text || null,
//       quotation_sections: quotation.quotation_sections || null,
//       section_toggles: quotation.section_toggles || undefined,
//       selected_points: quotation.selected_points || null,
//       services: quotation.services || [],
//       share_token: null,
//       wizard_step: 4,
//     });
//     toast({ title: "Template saved", description: "Quotation saved as a reusable template." });
//   };

//   const handleApprove = async (quotation: Quotation) => {
//     try {
//       const updated = {
//         ...quotation,
//         status: "accepted" as const,
//         accepted_at: new Date().toISOString(),
//       };

//       await updateQuotation(updated);

//       toast({
//         title: "Quotation Approved",
//         description: "Quotation moved to Accepted.",
//       });
//     } catch (err) {
//       console.error(err);

//       toast({
//         title: "Error",
//         description: "Failed to approve quotation.",
//         variant: "destructive",
//       });
//     }
//   };

//   const handleDecline = async (quotation: Quotation) => {
//     try {
//       const updated = {
//         ...quotation,
//         status: "declined" as const,
//       };

//       await updateQuotation(updated);

//       toast({
//         title: "Quotation Declined",
//         description: "Quotation moved to Declined.",
//         variant: "destructive",
//       });
//     } catch (err) {
//       console.error(err);

//       toast({
//         title: "Error",
//         description: "Failed to decline quotation.",
//         variant: "destructive",
//       });
//     }
//   };

//   const getLatestInvoiceForQuotation = (quotationId: string) => {
//     return invoices
//       .filter((inv) => inv.quotation_id === quotationId)
//       .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
//   };

//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString('en-US', {
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric',
//     });
//   };

//   return (
//     <div className="space-y-8 animate-fade-in">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-3xl font-heading font-bold text-foreground">Quotations</h1>
//           <p className="text-muted-foreground mt-1">Create and manage client quotations.</p>
//         </div>
//         <div className="flex items-center gap-3">
//           <NotificationBell />
//           <Link to="/quotations/new">
//             <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
//               <Plus className="w-4 h-4" /> New Quotation
//             </Button>
//           </Link>
//         </div>
//       </div>
//       {/* Filters & Sorting */}
//       <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
//         <div className="relative w-full xl:w-72">
//           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
//           <Input
//             placeholder="Search..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className="pl-10 h-10"
//           />
//         </div>

//         <div className="flex-1 w-full overflow-x-auto pb-1 scrollbar-hide flex items-center gap-2 justify-start xl:justify-center">
//           {['all', 'draft', 'sent', 'accepted', 'invoiced', 'declined'].map((status) => (
//             <Button
//               key={status}
//               variant={statusFilter === status ? 'default' : 'outline'}
//               size="sm"
//               onClick={() => setStatusFilter(status)}
//               className="rounded-full capitalize whitespace-nowrap px-3 h-8"
//             >
//               {status === 'all' ? 'All' : status}
//             </Button>
//           ))}
//         </div>

//         <div className="w-full xl:w-40">
//           <Select value={sortBy} onValueChange={setSortBy}>
//             <SelectTrigger className="w-full h-10">
//               <ArrowUpDown className="w-4 h-4 mr-2" />
//               <SelectValue placeholder="Sort" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="newest">Newest First</SelectItem>
//               <SelectItem value="oldest">Oldest First</SelectItem>
//               <SelectItem value="highest">Highest Value</SelectItem>
//               <SelectItem value="lowest">Lowest Value</SelectItem>
//             </SelectContent>
//           </Select>
//         </div>
//       </div>


//       {/* Stats Summary */}
//       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
//         {
//           ['draft', 'sent', 'accepted', 'invoiced', 'declined'].map(status => {
//             const count = quotations.filter(q => (q.status || 'draft') === status && !q.is_template).length;
//             const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
//             return (
//               <Card
//                 key={status}
//                 className={`border-border/50 cursor-pointer transition-all ${statusFilter === status ? 'ring-2 ring-accent' : ''}`}
//                 onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
//               >
//                 <CardContent className="p-4">
//                   <div className="flex items-center justify-between">
//                     <Badge className={config.color}>{config.label}</Badge>
//                     <span className="font-heading font-bold text-2xl">{count}</span>
//                   </div>
//                 </CardContent>
//               </Card>
//             );
//           })
//         }
//       </div>

//       {/* Quotations List */}
//       <div className="space-y-3">
//         {
//           filteredQuotations.map((quotation) => (


//             <Card key={quotation.id} className="border-border/50 shadow-card card-hover">
//               <CardContent className="p-0">
//                 <div className="flex items-center justify-between p-5">
//                   <div className="flex items-center gap-4 flex-1 min-w-0">
//                     <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
//                       <FileText className="w-6 h-6 text-primary" />
//                     </div>
//                     <div className="min-w-0">
//                       <div className="flex items-center gap-3 mb-1">
//                         <h3 className="font-heading font-semibold text-foreground truncate">
//                           {quotation.title || `Quote #${quotation.quotation_number}`}
//                         </h3>
//                         <Badge className={(statusConfig[(quotation.status || 'draft') as keyof typeof statusConfig] || statusConfig.draft).color}>
//                           {(statusConfig[(quotation.status || 'draft') as keyof typeof statusConfig] || statusConfig.draft).label}
//                         </Badge>
//                       </div>
//                       <div className="flex items-center gap-4 text-sm text-muted-foreground">
//                         <span>{quotation.client?.business_name || quotation.client?.name || 'No client'}</span>
//                         <span className="flex items-center gap-1">
//                           <Calendar className="w-3 h-3" />
//                           {formatDate(quotation.created_at)}
//                         </span>
//                         <span className="font-mono text-xs">{quotation.quotation_number}</span>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="flex items-center gap-6">
//                     {/* <div className="text-right">
//                       <p className="text-xs text-muted-foreground">Total Value</p>
//                       <p className="font-heading font-bold text-xl text-foreground">
//                         {(quotation.currency || currency) === 'INR' ? '₹' : '$'}{quotation.total.toLocaleString()}
//                       </p>
//                     </div> */}

//                     <div className="flex items-center gap-4">

//                       {quotation.status === "sent" && (
//                         <div className="flex items-center gap-2">

//                           <Button
//                             size="icon"
//                             variant="ghost"
//                             className="h-9 w-9 rounded-full text-green-600 hover:bg-green-50 hover:text-green-700"
//                             title="Accept"
//                             onClick={() => handleApprove(quotation)}
//                           >
//                             <CheckCircle2 className="h-7 w-7" strokeWidth={2.2} />
//                           </Button>

//                           <Button
//                             size="icon"
//                             variant="ghost"
//                             className="h-9 w-9 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
//                             title="Decline"
//                             onClick={() => handleDecline(quotation)}
//                           >
//                             <XCircle className="h-10 w-10" strokeWidth={2.2} />
//                           </Button>

//                         </div>
//                       )}

//                       {(quotation.status === 'accepted' || quotation.status === 'invoiced') && (() => {
//                         const serviceBlocks = quotation.service_blocks ?? [];

//                         const eligibilities = serviceBlocks.map((s) =>
//                           getServiceInvoiceEligibility(quotation.id, s, invoices, invoiceItems)
//                         );

//                         // Frozen once EVERY service on this quotation is fully invoiced.
//                         const allServicesFullyInvoiced =
//                           serviceBlocks.length > 0 && eligibilities.every((e) => e.completed);

//                         // Enabled as long as AT LEAST ONE remaining (not-yet-completed) service
//                         // is eligible right now (i.e. its previous invoice, if any, is paid).
//                         const canGenerate = eligibilities.some((e) => e.canGenerate);

//                         const tooltipLabel = allServicesFullyInvoiced
//                           ? 'No invoice to generate'
//                           : !canGenerate
//                             ? "Can't generate right now"
//                             : 'Generate Invoice';

//                         return (
//                           <Tooltip>
//                             <TooltipTrigger asChild>
//                               <span className="inline-flex">
//                                 <Button
//                                   size="icon"
//                                   className="h-7 w-7 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed"
//                                   disabled={!canGenerate}
//                                   onClick={() => {
//                                     if (!canGenerate) return;
//                                     setInvoiceQuotation(quotation);
//                                     setInvoiceModalOpen(true);
//                                   }}
//                                 >
//                                   <FilePlus2 className="h-4 w-4" />
//                                 </Button>
//                               </span>
//                             </TooltipTrigger>
//                             <TooltipContent>{tooltipLabel}</TooltipContent>
//                           </Tooltip>
//                         );
//                       })()}

//                       {quotation.status === 'declined' && (
//                         <Tooltip>
//                           <TooltipTrigger asChild>
//                             <span className="inline-flex">
//                               <Button
//                                 size="icon"
//                                 variant="outline"
//                                 className="h-7 w-7 rounded-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-600"
//                                 onClick={() => {
//                                   setDeclineNoteQuotation(quotation);
//                                   setDeclineNoteOpen(true);
//                                 }}
//                               >
//                                 <MessageSquareText className="h-4 w-4" />
//                               </Button>
//                             </span>
//                           </TooltipTrigger>
//                           <TooltipContent className="text-red-700">View decline reason</TooltipContent>
//                         </Tooltip>
//                       )}

//                       {(quotation.status === 'accepted' || quotation.status === 'invoiced') && (() => {
//                         const hasAnyInvoice = Boolean(getLatestInvoiceForQuotation(quotation.id));

//                         return (
//                           <Tooltip>
//                             <TooltipTrigger asChild>
//                               <span className="inline-flex">
//                                 <Button
//                                   size="icon"
//                                   variant="outline"
//                                   className="h-7 w-7 rounded-full border-black disabled:opacity-40 disabled:cursor-not-allowed "
//                                   disabled={!hasAnyInvoice}
//                                   onClick={() => {
//                                     if (!hasAnyInvoice) return;
//                                     setHistoryQuotation(quotation);
//                                     setHistoryModalOpen(true);
//                                   }}
//                                 >
//                                   <History className="h-4 w-4 " />
//                                 </Button>
//                               </span>
//                             </TooltipTrigger>
//                             <TooltipContent className="text-green-700">
//                               {hasAnyInvoice ? 'Check History' : 'No invoices generated yet'}
//                             </TooltipContent>
//                           </Tooltip>
//                         );
//                       })()}

//                       <div className="text-right">
//                         <div className="text-sm text-muted-foreground">
//                           Total Value
//                         </div>
//                         <div className="text-md font-bold">
//                           {(quotation.currency || currency) === 'INR' ? '₹' : '$'}{quotation.total.toLocaleString()}
//                         </div>
//                       </div>


//                     </div>


//                     <DropdownMenu>
//                       <DropdownMenuTrigger asChild>
//                         <Button
//                           variant="ghost"
//                           size="icon"
//                           className="h-8 w-8 hover:bg-transparent hover:text-inherit focus:bg-transparent active:bg-transparent"
//                         >
//                           <MoreVertical className="w-4 h-4" />
//                         </Button>
//                       </DropdownMenuTrigger>

//                       <DropdownMenuContent align="end" className="w-48">
//                         <DropdownMenuItem asChild>
//                           <Link to={`/quotations/${quotation.id}/preview`} className="flex items-center gap-2">
//                             <Eye className="w-4 h-4" /> View
//                           </Link>
//                         </DropdownMenuItem>
//                         <DropdownMenuItem asChild disabled={Boolean(quotation.invoiced_at)}>
//                           <Link
//                             to={`/quotations/new?draftId=${quotation.id}`}
//                             className="flex items-center gap-2"
//                           >
//                             <Edit2 className="w-4 h-4" />
//                             Edit
//                           </Link>
//                         </DropdownMenuItem>

//                         {quotation.status !== 'draft' && (
//                           <DropdownMenuItem
//                             className="gap-2"
//                             disabled={Boolean(quotation.invoiced_at)}
//                             onClick={async () => {
//                               try {
//                                 await updateQuotation({
//                                   ...quotation,
//                                   status: 'draft',
//                                   sent_at: quotation.sent_at ?? null,
//                                   accepted_at: quotation.accepted_at ?? null,
//                                 });
//                                 toast({
//                                   title: 'Marked as draft',
//                                   description: 'The quotation is now marked as draft.',
//                                 });
//                               } catch (err) {
//                                 if (import.meta.env.DEV) console.error('Failed to mark quotation as draft', err);
//                                 toast({
//                                   title: 'Error',
//                                   description: 'Failed to mark quotation as draft.',
//                                   variant: 'destructive',
//                                 });
//                               }
//                             }}
//                           >
//                             <RotateCcw className="w-4 h-4" /> Mark as Draft
//                           </DropdownMenuItem>
//                         )}

//                         {quotation.status !== 'sent' && quotation.status !== 'accepted' && (
//                           <DropdownMenuItem
//                             className="gap-2"
//                             disabled={Boolean(quotation.invoiced_at)}
//                             onClick={async () => {
//                               try {
//                                 await updateQuotation({
//                                   ...quotation,
//                                   status: 'sent',
//                                   sent_at: quotation.sent_at ?? null,
//                                   accepted_at: quotation.accepted_at ?? null,
//                                 });
//                                 toast({
//                                   title: 'Marked as sent',
//                                   description: 'The quotation is now marked as sent.',
//                                 });
//                               } catch (err) {
//                                 if (import.meta.env.DEV) console.error('Failed to mark quotation as sent', err);
//                                 toast({
//                                   title: 'Error',
//                                   description: 'Failed to mark quotation as sent.',
//                                   variant: 'destructive',
//                                 });
//                               }
//                             }}
//                           >
//                             <Calendar className="w-4 h-4" /> Mark as Sent
//                           </DropdownMenuItem>
//                         )}

//                         {quotation.status !== 'accepted' && quotation.status !== 'invoiced' && (
//                           <DropdownMenuItem
//                             className="gap-2"
//                             // disabled={Boolean(quotation.invoiced_at)}
//                             disabled={false}
//                             onClick={async () => {
//                               try {
//                                 await updateQuotation({
//                                   ...quotation,
//                                   status: "accepted",
//                                   accepted_at: new Date().toISOString(),
//                                 });
//                                 toast({
//                                   title: 'Marked as approved',
//                                   description: 'The quotation is now marked as approved.',
//                                 });
//                               } catch (err) {
//                                 if (import.meta.env.DEV) console.error('Failed to mark quotation as approved', err);
//                                 toast({
//                                   title: 'Error',
//                                   description: 'Failed to mark quotation as approved.',
//                                   variant: 'destructive',
//                                 });
//                               }
//                             }}
//                           >
//                             <CheckCircle className="w-4 h-4" /> Mark as Approved
//                           </DropdownMenuItem>
//                         )}

//                         {quotation.status === 'invoiced' && quotation.invoiced_at && (
//                           <DropdownMenuItem
//                             className="gap-2"
//                             onClick={async () => {
//                               try {
//                                 const { findInvoiceIdForQuotation } = await import('@/lib/invoiceLookup');
//                                 const invoiceId = await findInvoiceIdForQuotation(quotation.id);
//                                 if (!invoiceId) {
//                                   toast({
//                                     title: 'Invoice not found',
//                                     description: 'No invoice record was found for this quotation yet.',
//                                     variant: 'destructive',
//                                   });
//                                   return;
//                                 }

//                                 toast({
//                                   title: 'Opening invoice',
//                                   description: 'Loading the invoice record...',
//                                 });

//                                 navigate(`/invoices/${invoiceId}`);
//                               } catch (err) {
//                                 if (import.meta.env.DEV) console.error('Invoice lookup failed', err);
//                                 toast({
//                                   title: 'Error',
//                                   description: 'Failed to open invoice.',
//                                   variant: 'destructive',
//                                 });
//                               }
//                             }}
//                           >
//                             <Receipt className="w-4 h-4" /> View Invoice
//                           </DropdownMenuItem>
//                         )}

//                         <DropdownMenuItem onClick={() => handleDuplicate(quotation)} className="gap-2">
//                           <Copy className="w-4 h-4" /> Duplicate
//                         </DropdownMenuItem>
//                         {/* <DropdownMenuItem onClick={() => handleSaveAsTemplate(quotation)} className="gap-2">
//                           <FileText className="w-4 h-4" /> Save as Template
//                         </DropdownMenuItem> */}
//                         <DropdownMenuSeparator />
//                         <DropdownMenuItem onClick={() => handleDelete(quotation.id)} className="gap-2 text-destructive">
//                           <Trash2 className="w-4 h-4" /> Delete
//                         </DropdownMenuItem>
//                       </DropdownMenuContent>
//                     </DropdownMenu>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           ))
//         }
//       </div >

//       {
//         filteredQuotations.length === 0 && (
//           <div className="text-center py-16">
//             <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
//               <FileText className="w-8 h-8 text-muted-foreground" />
//             </div>
//             <p className="text-muted-foreground mb-4">
//               {searchQuery || statusFilter !== 'all' ? 'No quotations match your filters' : 'No quotations yet'}
//             </p>
//             <Link to="/quotations/new">
//               <Button variant="outline" className="gap-2">
//                 <Plus className="w-4 h-4" /> Create your first quotation
//               </Button>
//             </Link>
//           </div>
//         )
//       }
//       {invoiceQuotation && (
//         <GenerateInvoiceModal
//           open={invoiceModalOpen}
//           onOpenChange={(open) => {
//             setInvoiceModalOpen(open);
//             if (!open) {
//               setInvoiceQuotation(null);
//             }
//           }}
//           quotation={invoiceQuotation}
//           selectedServiceId={null}
//           onGenerated={async (invoiceId) => {
//             await Promise.all([refreshQuotations(), refreshInvoices(), refreshInvoiceItems()]);
//             setInvoiceModalOpen(false);
//             setInvoiceQuotation(null);
//             navigate(`/invoices/${invoiceId}`);
//           }}
//         />
//       )}

//       <InvoiceHistoryModal
//         open={historyModalOpen}
//         onOpenChange={(open) => {
//           setHistoryModalOpen(open);
//           if (!open) setHistoryQuotation(null);
//         }}
//         quotation={historyQuotation}
//       />

//       <Dialog
//         open={declineNoteOpen}
//         onOpenChange={(open) => {
//           setDeclineNoteOpen(open);
//           if (!open) setDeclineNoteQuotation(null);
//         }}
//       >
//         <DialogContent className="max-w-md text-red">
//           <DialogHeader>
//             <DialogTitle>Decline Reason</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-2">
//             <p className="text-sm text-muted-foreground">
//               {declineNoteQuotation?.client?.business_name || declineNoteQuotation?.client?.name || 'Client'} declined this quotation.
//             </p>
//             <div className="rounded-xl border border-border/50 p-3 bg-secondary/30">
//               <p className="text-sm text-foreground whitespace-pre-wrap">
//                 {declineNoteQuotation?.declined_reason?.trim() || 'No reason was provided.'}
//               </p>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </div >
//   );
// }


import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GenerateInvoiceModal } from '@/components/invoices/GenerateInvoiceModal';
import InvoiceHistoryModal from '@/components/invoices/InvoiceHistoryModal';
import {
  Plus,
  Search,
  FileText,
  MoreVertical,
  Eye,
  Edit2,
  Copy,
  Trash2,
  Filter,
  ArrowUpDown,
  Calendar,
  CreditCard,
  CheckCircle,
  Receipt,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FilePlus2,
  History,
  MessageSquareText,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Quotation } from '@/lib/types';
import { getServiceInvoiceEligibility } from '@/lib/phase4Invoicing';
import { string } from 'zod';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700' },
  invoiced: { label: 'Invoiced', color: 'bg-purple-100 text-purple-700' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-600' },
};

export default function Quotations() {
  const navigate = useNavigate();
  const { quotations, deleteQuotation, addQuotation, updateQuotation, currency, refreshQuotations, refreshInvoices, refreshInvoiceItems, invoices, invoiceItems } = useApp();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  let filteredQuotations = quotations.filter(q => !q.is_template);

  if (searchQuery) {
    filteredQuotations = filteredQuotations.filter(q =>
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.client?.business_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (statusFilter !== 'all') {
    filteredQuotations = filteredQuotations.filter(q => q.status === statusFilter);
  }

  filteredQuotations.sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'highest') return b.total - a.total;
    if (sortBy === 'lowest') return a.total - b.total;
    return 0;
  });

  const DRAFT_LS_KEY = 'currentDraftId';

  const clearDraftPointersIfMatching = (id: string) => {
    const currentDraftId = localStorage.getItem(DRAFT_LS_KEY);
    if (currentDraftId !== id) return;

    localStorage.removeItem(DRAFT_LS_KEY);

    const params = new URLSearchParams(window.location.search);
    if (params.get('draftId') === id) {
      params.delete('draftId');
      navigate({ pathname: '/quotations', search: params.toString() ? `?${params.toString()}` : '' });
    }
  };

  const handleDelete = async (id: string) => {
    clearDraftPointersIfMatching(id);
    await deleteQuotation(id);
    toast({ title: "Quotation deleted", description: "The quotation has been removed." });
  };

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceQuotation, setInvoiceQuotation] = useState<Quotation | null>(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyQuotation, setHistoryQuotation] = useState<Quotation | null>(null);

  const [declineNoteOpen, setDeclineNoteOpen] = useState(false);
  const [declineNoteQuotation, setDeclineNoteQuotation] = useState<Quotation | null>(null);

  const duplicateInProgressRef = useRef(false);
  const handleDuplicate = async (quotation: Quotation) => {
    if (duplicateInProgressRef.current) return;
    duplicateInProgressRef.current = true;
    const activeDrafts = quotations
      .filter((q) => q.status === 'draft' && !q.is_template)
      .filter((q) => !q.sent_at && !q.accepted_at && !q.invoiced_at);

    try {
      await Promise.all(activeDrafts.map((d) => deleteQuotation(d.id)));

      localStorage.removeItem(DRAFT_LS_KEY);

      const duplicatedId = await addQuotation({
        quotation_number: `QT-${Date.now().toString().slice(-6)}`,
        title: `${quotation.title} (Copy)`,
        client_id: quotation.client_id || null,
        introduction: quotation.introduction || null,
        scope_of_work: quotation.scope_of_work || null,
        currency: quotation.currency,
        subtotal: quotation.subtotal,
        discount: quotation.discount,
        discount_type: quotation.discount_type,
        tax_rate: quotation.tax_rate,
        tax_amount: quotation.tax_amount,
        total: quotation.total,
        quote_date: quotation.quote_date,
        valid_until: quotation.valid_until,
        status: 'draft',
        sent_at: null,
        accepted_at: null,
        accepted_by: quotation.accepted_by ?? null,
        invoiced_at: null,
        is_template: false,
        template_name: null,
        notes: quotation.notes || null,
        payment_terms_text: quotation.payment_terms_text || null,
        terms_conditions_text: quotation.terms_conditions_text || null,
        quotation_sections: quotation.quotation_sections || null,
        section_toggles: quotation.section_toggles || undefined,
        selected_points: quotation.selected_points || null,
        services: quotation.services || [],
        share_token: null,
        wizard_step: 1,
      });

      if (!duplicatedId) {
        toast({ title: 'Error', description: 'Failed to duplicate quotation.', variant: 'destructive' });
        return;
      }

      localStorage.setItem(DRAFT_LS_KEY, duplicatedId);
      navigate(`/quotations/new?draftId=${duplicatedId}`);
      toast({ title: 'Quotation duplicated', description: 'A copy has been created as a draft.' });
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to duplicate quotation', err);
      toast({
        title: 'Error',
        description: 'Could not duplicate quotation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      duplicateInProgressRef.current = false;
    }
  };

  const handleSaveAsTemplate = async (quotation: Quotation) => {
    await addQuotation({
      quotation_number: quotation.quotation_number,
      title: quotation.title,
      client_id: quotation.client_id || null,
      introduction: quotation.introduction || null,
      scope_of_work: quotation.scope_of_work || null,
      currency: quotation.currency,
      subtotal: quotation.subtotal,
      discount: quotation.discount,
      discount_type: quotation.discount_type,
      tax_rate: quotation.tax_rate,
      tax_amount: quotation.tax_amount,
      total: quotation.total,
      quote_date: quotation.quote_date,
      valid_until: quotation.valid_until,
      status: quotation.status,
      sent_at: quotation.sent_at,
      accepted_at: quotation.accepted_at,
      invoiced_at: quotation.invoiced_at,
      is_template: true,
      template_name: quotation.title,
      notes: quotation.notes || null,
      payment_terms_text: quotation.payment_terms_text || null,
      terms_conditions_text: quotation.terms_conditions_text || null,
      quotation_sections: quotation.quotation_sections || null,
      section_toggles: quotation.section_toggles || undefined,
      selected_points: quotation.selected_points || null,
      services: quotation.services || [],
      share_token: null,
      wizard_step: 4,
    });
    toast({ title: "Template saved", description: "Quotation saved as a reusable template." });
  };

  const handleApprove = async (quotation: Quotation) => {
    try {
      const updated = {
        ...quotation,
        status: "accepted" as const,
        accepted_at: new Date().toISOString(),
      };

      await updateQuotation(updated);

      toast({
        title: "Quotation Approved",
        description: "Quotation moved to Accepted.",
      });
    } catch (err) {
      console.error(err);

      toast({
        title: "Error",
        description: "Failed to approve quotation.",
        variant: "destructive",
      });
    }
  };

  const handleDecline = async (quotation: Quotation) => {
    try {
      const updated = {
        ...quotation,
        status: "declined" as const,
      };

      await updateQuotation(updated);

      toast({
        title: "Quotation Declined",
        description: "Quotation moved to Declined.",
        variant: "destructive",
      });
    } catch (err) {
      console.error(err);

      toast({
        title: "Error",
        description: "Failed to decline quotation.",
        variant: "destructive",
      });
    }
  };

  const getLatestInvoiceForQuotation = (quotationId: string) => {
    return invoices
      .filter((inv) => inv.quotation_id === quotationId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center shrink-0 shadow-sm">
            <FileText className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">Quotations</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Create and manage client quotations.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <Link to="/quotations/new">
            <Button className="bg-black text-white hover:bg-black/85 gap-2 rounded-xl h-11 px-5 shadow-sm transition-transform active:scale-[0.98]">
              <Plus className="w-4 h-4" /> New Quotation
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters & Sorting */}
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between rounded-2xl border border-border/60 bg-card p-3">
        <div className="relative w-full xl:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search quotations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl border-border/70 bg-background focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:border-black transition-colors"
          />
        </div>

        <div className="flex-1 w-full overflow-x-auto pb-0.5 scrollbar-hide flex items-center gap-2 justify-start xl:justify-center">
          {['all', 'draft', 'sent', 'accepted', 'invoiced', 'declined'].map((status) => (
            <Button
              key={status}
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full capitalize whitespace-nowrap px-4 h-9 font-medium transition-colors ${statusFilter === status
                ? 'bg-black text-white hover:bg-black/85 hover:text-white'
                : 'bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
            >
              {status === 'all' ? 'All' : status}
            </Button>
          ))}
        </div>

        <div className="w-full xl:w-44">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full h-11 rounded-xl border-border/70 bg-background">
              <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest">Highest Value</SelectItem>
              <SelectItem value="lowest">Lowest Value</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {
          ['draft', 'sent', 'accepted', 'invoiced', 'declined'].map(status => {
            const count = quotations.filter(q => (q.status || 'draft') === status && !q.is_template).length;
            const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
            const isActive = statusFilter === status;
            return (
              <Card
                key={status}
                className={`cursor-pointer transition-all duration-200 rounded-2xl overflow-hidden group ${isActive
                  ? 'border-2 border-black shadow-md'
                  : 'border border-border/50 hover:border-black/30 hover:shadow-sm'
                  }`}
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Badge className={`${config.color} font-medium border-0`}>{config.label}</Badge>
                    <span className="font-heading font-bold text-2xl tabular-nums text-foreground group-hover:scale-105 transition-transform">
                      {count}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        }
      </div>

      {/* Quotations List */}
      <div className="space-y-3">
        {
          filteredQuotations.map((quotation) => (

            <Card
              key={quotation.id}
              className="group border border-border/50 rounded-2xl overflow-hidden transition-all duration-200 hover:border-black/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
            >
              <CardContent className="p-0">
                <div className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-black transition-all duration-300">
                      <FileText className="w-5 h-5 text-primary group-hover:text-white transition-colors duration-300" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-heading font-semibold text-foreground truncate">
                          {quotation.title || `Quote #${quotation.quotation_number}`}
                        </h3>
                        <Badge className={`${(statusConfig[(quotation.status || 'draft') as keyof typeof statusConfig] || statusConfig.draft).color} border-0 font-medium`}>
                          {(statusConfig[(quotation.status || 'draft') as keyof typeof statusConfig] || statusConfig.draft).label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        <span className="font-medium text-foreground/70">{quotation.client?.business_name || quotation.client?.name || 'No client'}</span>
                        <span className="text-border">•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(quotation.created_at)}
                        </span>
                        <span className="text-border">•</span>
                        <span className="font-mono text-xs text-muted-foreground/80">{quotation.quotation_number}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">

                    <div className="flex items-center gap-1.5 rounded-full bg-secondary/50 p-1">

                      {quotation.status === "sent" && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full text-green-600 hover:bg-green-100 hover:text-green-700"
                            title="Accept"
                            onClick={() => handleApprove(quotation)}
                          >
                            <CheckCircle2 className="h-5 w-5" strokeWidth={2.2} />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full text-red-600 hover:bg-red-100 hover:text-red-700"
                            title="Decline"
                            onClick={() => handleDecline(quotation)}
                          >
                            <XCircle className="h-5 w-5" strokeWidth={2.2} />
                          </Button>
                        </>
                      )}

                      {(quotation.status === 'accepted' || quotation.status === 'invoiced') && (() => {
                        const serviceBlocks = quotation.service_blocks ?? [];

                        const eligibilities = serviceBlocks.map((s) =>
                          getServiceInvoiceEligibility(quotation.id, s, invoices, invoiceItems)
                        );

                        const allServicesFullyInvoiced =
                          serviceBlocks.length > 0 && eligibilities.every((e) => e.completed);

                        const canGenerate = eligibilities.some((e) => e.canGenerate);

                        const tooltipLabel = allServicesFullyInvoiced
                          ? 'No invoice to generate'
                          : !canGenerate
                            ? "Can't generate right now"
                            : 'Generate Invoice';

                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Button
                                  size="icon"
                                  className="h-8 w-8 rounded-full bg-black text-white hover:bg-black/85 disabled:opacity-30 disabled:cursor-not-allowed"
                                  disabled={!canGenerate}
                                  onClick={() => {
                                    if (!canGenerate) return;
                                    setInvoiceQuotation(quotation);
                                    setInvoiceModalOpen(true);
                                  }}
                                >
                                  <FilePlus2 className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{tooltipLabel}</TooltipContent>
                          </Tooltip>
                        );
                      })()}

                      {quotation.status === 'declined' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full text-red-600 hover:bg-red-100 hover:text-red-600"
                                onClick={() => {
                                  setDeclineNoteQuotation(quotation);
                                  setDeclineNoteOpen(true);
                                }}
                              >
                                <MessageSquareText className="h-4 w-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="text-red-700">View decline reason</TooltipContent>
                        </Tooltip>
                      )}

                      {(quotation.status === 'accepted' || quotation.status === 'invoiced') && (() => {
                        const hasAnyInvoice = Boolean(getLatestInvoiceForQuotation(quotation.id));

                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-full text-foreground hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-foreground"
                                  disabled={!hasAnyInvoice}
                                  onClick={() => {
                                    if (!hasAnyInvoice) return;
                                    setHistoryQuotation(quotation);
                                    setHistoryModalOpen(true);
                                  }}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="text-green-700">
                              {hasAnyInvoice ? 'Check History' : 'No invoices generated yet'}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })()}

                    </div>

                    <div className="text-right min-w-[100px]">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">
                        Total Value
                      </div>
                      <div className="text-lg font-heading font-bold text-foreground">
                        {(quotation.currency || currency) === 'INR' ? '₹' : '$'}{quotation.total.toLocaleString()}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-secondary"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuItem asChild>
                          <Link to={`/quotations/${quotation.id}/preview`} className="flex items-center gap-2">
                            <Eye className="w-4 h-4" /> View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild disabled={Boolean(quotation.invoiced_at)}>
                          <Link
                            to={`/quotations/new?draftId=${quotation.id}`}
                            className="flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>

                        {quotation.status === 'sent' && (
                          <DropdownMenuItem
                            className="gap-2"
                            disabled={Boolean(quotation.invoiced_at)}
                            onClick={async () => {
                              try {
                                await updateQuotation({
                                  ...quotation,
                                  status: 'draft',
                                  sent_at: quotation.sent_at ?? null,
                                  accepted_at: quotation.accepted_at ?? null,
                                });
                                toast({
                                  title: 'Marked as draft',
                                  description: 'The quotation is now marked as draft.',
                                });
                              } catch (err) {
                                if (import.meta.env.DEV) console.error('Failed to mark quotation as draft', err);
                                toast({
                                  title: 'Error',
                                  description: 'Failed to mark quotation as draft.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            <RotateCcw className="w-4 h-4" /> Mark as Draft
                          </DropdownMenuItem>
                        )}

                        {quotation.status === 'draft' && (
                          <DropdownMenuItem
                            className="gap-2"
                            disabled={Boolean(quotation.invoiced_at)}
                            onClick={async () => {
                              try {
                                await updateQuotation({
                                  ...quotation,
                                  status: 'sent',
                                  sent_at: quotation.sent_at ?? null,
                                  accepted_at: quotation.accepted_at ?? null,
                                });
                                toast({
                                  title: 'Marked as sent',
                                  description: 'The quotation is now marked as sent.',
                                });
                              } catch (err) {
                                if (import.meta.env.DEV) console.error('Failed to mark quotation as sent', err);
                                toast({
                                  title: 'Error',
                                  description: 'Failed to mark quotation as sent.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            <Calendar className="w-4 h-4" /> Mark as Sent
                          </DropdownMenuItem>
                        )}

                        {quotation.status === 'sent' && (
                          <DropdownMenuItem
                            className="gap-2"
                            disabled={false}
                            onClick={async () => {
                              try {
                                await updateQuotation({
                                  ...quotation,
                                  status: "accepted",
                                  accepted_at: new Date().toISOString(),
                                });
                                toast({
                                  title: 'Marked as approved',
                                  description: 'The quotation is now marked as approved.',
                                });
                              } catch (err) {
                                if (import.meta.env.DEV) console.error('Failed to mark quotation as approved', err);
                                toast({
                                  title: 'Error',
                                  description: 'Failed to mark quotation as approved.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            <CheckCircle className="w-4 h-4" /> Mark as Approved
                          </DropdownMenuItem>
                        )}

                        {quotation.status === 'invoiced' && quotation.invoiced_at && (
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={async () => {
                              try {
                                const { findInvoiceIdForQuotation } = await import('@/lib/invoiceLookup');
                                const invoiceId = await findInvoiceIdForQuotation(quotation.id);
                                if (!invoiceId) {
                                  toast({
                                    title: 'Invoice not found',
                                    description: 'No invoice record was found for this quotation yet.',
                                    variant: 'destructive',
                                  });
                                  return;
                                }

                                toast({
                                  title: 'Opening invoice',
                                  description: 'Loading the invoice record...',
                                });

                                navigate(`/invoices/${invoiceId}`);
                              } catch (err) {
                                if (import.meta.env.DEV) console.error('Invoice lookup failed', err);
                                toast({
                                  title: 'Error',
                                  description: 'Failed to open invoice.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            <Receipt className="w-4 h-4" /> View Invoice
                          </DropdownMenuItem>
                        )}

                        {quotation.status !== 'declined' && (
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(quotation)}
                            className="gap-2"
                          >
                            <Copy className="w-4 h-4" /> Duplicate
                          </DropdownMenuItem>
                        )}
                        {/* <DropdownMenuItem onClick={() => handleSaveAsTemplate(quotation)} className="gap-2">
                          <FileText className="w-4 h-4" /> Save as Template
                        </DropdownMenuItem> */}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(quotation.id)} className="gap-2 text-destructive">
                          <Trash2 className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div >

      {
        filteredQuotations.length === 0 && (
          <div className="text-center py-20 rounded-2xl border border-dashed border-border/60 bg-card">
            <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' ? 'No quotations match your filters' : 'No quotations yet'}
            </p>
            <Link to="/quotations/new">
              <Button variant="outline" className="gap-2 rounded-xl border-black hover:bg-black hover:text-white transition-colors">
                <Plus className="w-4 h-4" /> Create your first quotation
              </Button>
            </Link>
          </div>
        )
      }
      {invoiceQuotation && (
        <GenerateInvoiceModal
          open={invoiceModalOpen}
          onOpenChange={(open) => {
            setInvoiceModalOpen(open);
            if (!open) {
              setInvoiceQuotation(null);
            }
          }}
          quotation={invoiceQuotation}
          selectedServiceId={null}
          onGenerated={async (invoiceId) => {
            await Promise.all([refreshQuotations(), refreshInvoices(), refreshInvoiceItems()]);
            setInvoiceModalOpen(false);
            setInvoiceQuotation(null);
            navigate(`/invoices/${invoiceId}`);
          }}
        />
      )}

      <InvoiceHistoryModal
        open={historyModalOpen}
        onOpenChange={(open) => {
          setHistoryModalOpen(open);
          if (!open) setHistoryQuotation(null);
        }}
        quotation={historyQuotation}
      />

      <Dialog
        open={declineNoteOpen}
        onOpenChange={(open) => {
          setDeclineNoteOpen(open);
          if (!open) setDeclineNoteQuotation(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Decline Reason</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {declineNoteQuotation?.client?.business_name || declineNoteQuotation?.client?.name || 'Client'}
              </span>{' '}
              declined this quotation.
            </p>
            <div className="rounded-xl border border-border/60 p-4 bg-secondary/30">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {declineNoteQuotation?.declined_reason?.trim() || 'No reason was provided.'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}