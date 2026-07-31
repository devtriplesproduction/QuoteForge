
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Receipt, TrendingUp, Clock, CheckCircle2, FileStack } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import type { PaymentStatus } from "@/lib/types";

import { formatCurrency } from "@/lib/types";

const statusConfig = {
  draft: {
    label: "Draft",
    color: "bg-muted text-muted-foreground",
  },
  impending: {
    label: "Impending",
    color: "bg-blue-100 text-blue-700",
  },
  overdue: {
    label: "Overdue",
    color: "bg-red-100 text-red-700",
  },
  paid: {
    label: "Paid",
    color: "bg-green-100 text-green-700",
  },
  partially_paid: {
    label: "Partially Paid",
    color: "bg-amber-100 text-amber-700",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-600",
  },
} as const;

export default function Invoices() {
  const { currency, invoices } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('all');
  const [paidMethodFilter, setPaidMethodFilter] = useState<'all' | 'Online' | 'Cash' | 'Cheque'>('all');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices
      .filter((inv) => (statusFilter === 'all' ? true : inv.invoice_status === statusFilter))
      .filter((inv) => {
        // Sub-filter only applies once "Paid" is selected as the main status filter.
        if (statusFilter !== 'paid' || paidMethodFilter === 'all') return true;
        return inv.payment_method === paidMethodFilter;
      })
      .filter((inv) => {
        if (!q) return true;
        return (
          inv.invoice_number.toLowerCase().includes(q) ||
          (inv.client?.name || "").toLowerCase().includes(q) ||
          (inv.client?.business_name || "").toLowerCase().includes(q)
        );
      });
  }, [invoices, searchQuery, statusFilter, paidMethodFilter]);

  // ---------- Catalog-level stats (mirrors the Services page pattern) ----------
  const totalInvoices = invoices.length;
  const totalValue = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const totalPaid = invoices
    .filter((inv) => inv.invoice_status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + Number(inv.amount_due || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shrink-0 shadow-md shadow-black/10 ring-1 ring-black/5">
            <Receipt className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">Invoices</h1>
            <p className="text-muted-foreground mt-1">
              {totalInvoices} {totalInvoices === 1 ? 'invoice' : 'invoices'} in your records
            </p>
          </div>
        </div>
        <NotificationBell />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0">
              <FileStack className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Invoices</p>
              <p className="font-heading font-bold text-xl text-foreground tabular-nums">{totalInvoices}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Billed</p>
              <p className="font-heading font-bold text-xl text-foreground tabular-nums truncate">
                {formatCurrency(totalValue, currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Collected</p>
              <p className="font-heading font-bold text-xl text-foreground tabular-nums truncate">
                {formatCurrency(totalPaid, currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Outstanding</p>
              <p className="font-heading font-bold text-xl text-foreground tabular-nums truncate">
                {formatCurrency(totalOutstanding, currency)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-border/60 bg-secondary/20 p-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background rounded-xl border-border/70 focus-visible:ring-black/20"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['all', 'draft', 'sent', 'paid'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                if (s !== 'paid') setPaidMethodFilter('all');
              }}
              className={`px-4 h-10 rounded-xl border text-sm font-medium transition-all ${statusFilter === s
                ? 'bg-black text-white border-black shadow-sm'
                : 'bg-background border-border/70 text-muted-foreground hover:border-black/20 hover:text-foreground'
                }`}
              type="button"
            >
              {s === 'all' ? 'All' : s.toUpperCase()}
            </button>
          ))}
        </div>

        {statusFilter === 'paid' && (
          <div className="flex gap-2 flex-wrap items-center border-l border-border/60 pl-3 ml-1">
            {(['all', 'Online', 'Cash', 'Cheque'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPaidMethodFilter(m)}
                className={`px-3 h-9 rounded-lg border text-xs font-semibold transition-all ${paidMethodFilter === m
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-background border-border/70 text-muted-foreground hover:border-black/30 hover:text-foreground'
                  }`}
                type="button"
              >
                {m === 'all' ? 'ALL' : m.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {/* {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-12 h-12 rounded-full bg-primary/20"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-3"> */}
      <div className="space-y-3">
        {filtered.map((invoice) => {
          const cfg = statusConfig[(invoice.status as keyof typeof statusConfig) || 'draft'] ?? statusConfig.draft;
          const invCurrency = invoice.currency || currency;
          const pendingMethodLabel =
            invoice.invoice_status !== 'paid' && invoice.payment_method
              ? `Pay by ${invoice.payment_method}`
              : null;
          const paidMethodLabel =
            invoice.invoice_status === 'paid' && invoice.payment_method
              ? invoice.payment_method === 'Online'
                ? 'PAID ONLINE'
                : invoice.payment_method === 'Cash'
                  ? 'PAID BY CASH'
                  : invoice.payment_method === 'Cheque'
                    ? 'PAID BY CHEQUE'
                    : null
              : null;
          return (
            <Card
              key={invoice.id}
              className="relative overflow-hidden border border-border/60 hover:border-black/20 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
            >
              {/* Signature accent bar — echoes the billing-type accent used on the Services page */}
              <div className="absolute left-0 top-0 h-full w-1 bg-black" />

              <CardContent className="p-0">
                <Link to={`/invoices/${invoice.id}`} className="block">
                  <div className="flex items-center justify-between p-5 pl-6">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-black transition-all duration-300">
                        <Receipt className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-heading font-semibold text-foreground truncate group-hover:text-black transition-colors">
                            {invoice.quotation?.title || invoice.invoice_number} Invoice
                          </h3>
                          <Badge
                            className={`${pendingMethodLabel
                              ? 'bg-amber-100 text-amber-700'
                              : paidMethodLabel
                                ? 'bg-green-100 text-green-700'
                                : cfg.color
                              } rounded-full px-3 py-0.5 font-medium shrink-0`}
                          >
                            {paidMethodLabel || pendingMethodLabel || invoice.invoice_status?.toUpperCase?.() || cfg.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="truncate">
                            {invoice.client?.business_name || invoice.client?.name || "No client"}
                          </span>
                          {invoice.due_date && <span className="shrink-0">Due: {invoice.due_date}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                      <p className="font-heading font-bold text-xl text-foreground tabular-nums">
                        {formatCurrency(Number(invoice.total), invCurrency)}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                        Due: {formatCurrency(Number(invoice.amount_due), invCurrency)}
                      </p>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-20 rounded-2xl border border-dashed border-border/70 bg-secondary/20">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-1">
              {searchQuery || statusFilter !== 'all' ? 'No invoices match your filters' : 'No invoices yet'}
            </p>
            <p className="text-sm text-muted-foreground">
              Create an invoice from an approved quotation to see it here.
            </p>
            <Link to="/quotations" className="inline-block mt-4">
              <span className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-black">
                Go to quotations
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}