import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/pages/DatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
    FileText,
    Users,
    Calendar as CalendarIcon,
    Clock,
    UserPlus,
} from "lucide-react";

type Step1BasicInfoProps = {
    formData: any;
    setFormData: React.Dispatch<any>;

    titleError: string;
    setTitleError: (value: string) => void;

    titleSuggestions: string[];

    quotations: any[];

    draftId: string | null;

    clients: any[];

    filteredClientsForSelect: any[];

    clientSelectOpen: boolean;
    setClientSelectOpen: (value: boolean) => void;

    clientSearchQuery: string;
    setClientSearchQuery: (value: string) => void;

    openAddClientDialog: () => void;
};

export default function Step1BasicInfo(props: Step1BasicInfoProps) {

    const {
        formData,
        setFormData,
        titleError,
        setTitleError,
        titleSuggestions,
        quotations,
        draftId,
        clients,
        filteredClientsForSelect,
        clientSelectOpen,
        setClientSelectOpen,
        clientSearchQuery,
        setClientSearchQuery,
        openAddClientDialog,
    } = props;

    return (
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

                                        setFormData((p: any) => ({
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
                                    onValueChange={(value) => setFormData((p: any) => ({ ...p, client_id: value }))}
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
                                            setFormData((p: any) => ({
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
                                            setFormData((p: any) => ({
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

        </>
    );
}