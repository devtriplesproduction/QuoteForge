// import { useEffect, useMemo, useState } from "react";
// import { Link } from "react-router-dom";
// import { Search, ReceiptText } from "lucide-react";

// import { Card, CardContent } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { useApp } from "@/contexts/AppContext";
// import { formatCurrency } from "@/lib/types";

// export default function Receipts() {
//     const {
//         currency,
//         receipts,
//         invoices,
//     } = useApp();

//     const [searchQuery, setSearchQuery] = useState("");

//     const filtered = useMemo(() => {
//         const q = searchQuery.trim().toLowerCase();

//         return receipts.filter((receipt) => {
//             const invoice = invoices.find(
//                 (i) => i.id === receipt.invoice_id
//             );

//             const client =
//                 invoice?.client ||
//                 receipt.client;

//             if (!q) return true;

//             return (
//                 receipt.receipt_number?.toLowerCase().includes(q) ||

//                 invoice?.invoice_number
//                     ?.toLowerCase()
//                     .includes(q) ||

//                 client?.name
//                     ?.toLowerCase()
//                     .includes(q) ||

//                 client?.business_name
//                     ?.toLowerCase()
//                     .includes(q)
//             );
//         });
//     }, [receipts, invoices, searchQuery]);

//     return (
//         <div className="space-y-8 animate-fade-in">

//             {/* Header */}

//             <div className="flex items-center gap-4">
//                 <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center shrink-0 shadow-sm">
//                     <ReceiptText className="w-6 h-6 text-white" strokeWidth={2} />
//                 </div>
//                 <div>
//                     <h1 className="text-3xl font-heading font-bold">
//                         Receipts
//                     </h1>
//                     <p className="text-muted-foreground mt-1">
//                         View and manage payment receipts.
//                     </p>
//                 </div>
//             </div>

//             {/* Search */}

//             <div className="relative max-w-md">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />

//                 <Input
//                     placeholder="Search receipts..."
//                     className="pl-10"
//                     value={searchQuery}
//                     onChange={(e) =>
//                         setSearchQuery(e.target.value)
//                     }
//                 />
//             </div>

//             {/* Loading */}

//             <div className="space-y-3">

//                 {filtered.map((receipt) => {
//                     const invoice = invoices.find(
//                         (i) => i.id === receipt.invoice_id
//                     );

//                     const client =
//                         invoice?.client ||
//                         receipt.client;

//                     const cur =
//                         receipt.currency ||
//                         invoice?.currency ||
//                         currency;

//                     return (
//                         <Card
//                             key={receipt.id}
//                             className="border-border/50 shadow-card card-hover"
//                         >
//                             <CardContent className="p-0">

//                                 <Link
//                                     to={`/receipts/${receipt.id}`}
//                                     className="block"
//                                 >
//                                     <div className="flex items-center justify-between p-5">

//                                         {/* Left */}

//                                         <div className="flex items-center gap-4 flex-1 min-w-0">

//                                             <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
//                                                 <ReceiptText className="w-6 h-6 text-primary" />
//                                             </div>

//                                             <div className="min-w-0">

//                                                 <h3 className="font-heading font-semibold text-foreground truncate">
//                                                     {invoice?.quotation?.title || receipt.receipt_number} Receipt
//                                                 </h3>

//                                                 <div className="text-sm text-muted-foreground mt-1 space-y-1">

//                                                     <p>
//                                                         {client?.business_name ||
//                                                             client?.name ||
//                                                             "No Client"}
//                                                     </p>

//                                                     <p>
//                                                         Invoice:{" "}
//                                                         {invoice?.invoice_number ||
//                                                             "—"}
//                                                     </p>

//                                                     <p>
//                                                         Paid on{" "}
//                                                         {receipt.payment_date}
//                                                     </p>

//                                                 </div>

//                                             </div>

//                                         </div>

//                                         {/* Right */}

//                                         <div className="text-right">

//                                             <p className="text-xs text-muted-foreground">
//                                                 Amount Received
//                                             </p>

//                                             <p className="font-heading font-bold text-xl">
//                                                 {formatCurrency(
//                                                     Number(receipt.amount),
//                                                     cur
//                                                 )}
//                                             </p>

//                                             <p className="text-xs text-green-600 font-medium mt-1">
//                                                 Paid
//                                             </p>

//                                         </div>

//                                     </div>
//                                 </Link>

//                             </CardContent>
//                         </Card>
//                     );
//                 })}

//                 {filtered.length === 0 && (
//                     <div className="text-center py-16">

//                         <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
//                             <ReceiptText className="w-8 h-8 text-muted-foreground" />
//                         </div>

//                         <p className="text-muted-foreground mb-1">
//                             No receipts found
//                         </p>

//                         <p className="text-sm text-muted-foreground">
//                             Receipts will appear here once invoice
//                             payments are received.
//                         </p>

//                     </div>
//                 )}

//             </div>
//         </div>
//     );
// }



import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ReceiptText, Wallet, CalendarCheck, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/types";

export default function Receipts() {
    const {
        currency,
        receipts,
        invoices,
    } = useApp();


    const [paidMethodFilter, setPaidMethodFilter] = useState<'all' | 'Online' | 'Cash' | 'Cheque'>('all');
    const [searchQuery, setSearchQuery] = useState("");

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();

        return receipts.filter((receipt) => {
            const invoice = invoices.find(
                (i) => i.id === receipt.invoice_id
            );

            const client =
                invoice?.client ||
                receipt.client;

            // Apply payment method filter FIRST
            const paymentMethod = (
                receipt.payment_method ||
                invoice?.payment_method ||
                ""
            ).trim();

            if (
                paidMethodFilter !== "all" &&
                paymentMethod !== paidMethodFilter
            ) {
                return false;
            }

            // Then apply search
            if (!q) return true;

            return (
                receipt.receipt_number?.toLowerCase().includes(q) ||
                invoice?.invoice_number?.toLowerCase().includes(q) ||
                client?.name?.toLowerCase().includes(q) ||
                client?.business_name?.toLowerCase().includes(q)
            );
        });

    }, [receipts, invoices, searchQuery, paidMethodFilter]);

    // ---------- Catalog-level stats (mirrors the Invoices page pattern) ----------
    const totalReceipts = receipts.length;
    const totalCollected = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const mostRecentDate = receipts
        .map((r) => r.payment_date)
        .filter(Boolean)
        .sort((a, b) => String(b).localeCompare(String(a)))[0];

    return (
        <div className="space-y-8 animate-fade-in">

            {/* Header */}

            <div className="flex items-center gap-4 pb-2 border-b border-border/60">
                <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shrink-0 shadow-md shadow-black/10 ring-1 ring-black/5">
                    <ReceiptText className="w-7 h-7 text-white" strokeWidth={2} />
                </div>
                <div>
                    <h1 className="text-3xl font-heading font-bold tracking-tight">
                        Receipts
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {totalReceipts} {totalReceipts === 1 ? 'receipt' : 'receipts'} on record.
                    </p>
                </div>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0">
                            <ReceiptText className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Receipts</p>
                            <p className="font-heading font-bold text-xl text-foreground tabular-nums">{totalReceipts}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Collected</p>
                            <p className="font-heading font-bold text-xl text-foreground tabular-nums truncate">
                                {formatCurrency(totalCollected, currency)}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0">
                            <CalendarCheck className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Most Recent</p>
                            <p className="font-heading font-bold text-xl text-foreground truncate">
                                {mostRecentDate || "—"}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}

            <div className="flex gap-3 max-w-2xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />

                <Input
                    placeholder="Search receipts..."
                    className="pl-10 rounded-xl border-border/70 focus-visible:ring-black/20"
                    value={searchQuery}
                    onChange={(e) =>
                        setSearchQuery(e.target.value)
                    }
                />

                <div className="flex gap-2 flex-wrap items-center border-l border-border/60 pl-3 ml-1">
                    {(['all', 'Online', 'Cash', 'Cheque'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setPaidMethodFilter(m)}
                            className={`px-3 h-9 rounded-lg border text-xs font-semibold transition-all ${paidMethodFilter === m
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-background border-border/70 text-muted-foreground hover:border-emerald-400/50 hover:text-foreground'
                                }`}
                            type="button"
                        >
                            {m === 'all' ? 'ALL' : m.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="rounded-xl border border-border/70 px-3 py-2 bg-background"
            >
                <option value="all">All Payments</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
            </select> */}



            {/* Loading */}

            <div className="space-y-3">

                {filtered.map((receipt) => {
                    const invoice = invoices.find(
                        (i) => i.id === receipt.invoice_id
                    );

                    const client =
                        invoice?.client ||
                        receipt.client;

                    const cur =
                        receipt.currency ||
                        invoice?.currency ||
                        currency;

                    return (
                        <Card
                            key={receipt.id}
                            className="relative overflow-hidden border border-border/60 hover:border-black/20 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
                        >
                            {/* Signature accent bar — consistent with Invoices/Services cards */}
                            <div className="absolute left-0 top-0 h-full w-1 bg-black" />

                            <CardContent className="p-0">

                                <Link
                                    to={`/receipts/${receipt.id}`}
                                    className="block"
                                >
                                    <div className="flex items-center justify-between p-5 pl-6">

                                        {/* Left */}

                                        <div className="flex items-center gap-4 flex-1 min-w-0">

                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-black transition-all duration-300">
                                                <ReceiptText className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
                                            </div>

                                            <div className="min-w-0">

                                                <h3 className="font-heading font-semibold text-foreground truncate group-hover:text-black transition-colors">
                                                    {invoice?.quotation?.title || receipt.receipt_number} Receipt
                                                </h3>

                                                <div className="text-sm text-muted-foreground mt-1 space-y-0.5">

                                                    <p className="truncate">
                                                        {client?.business_name ||
                                                            client?.name ||
                                                            "No Client"}
                                                    </p>

                                                    <p className="truncate">
                                                        Invoice:{" "}
                                                        {invoice?.invoice_number ||
                                                            "—"}
                                                    </p>

                                                    <p className="flex items-center gap-1.5">
                                                        <CalendarCheck className="w-3.5 h-3.5 opacity-60 shrink-0" />
                                                        Paid on{" "}
                                                        {receipt.payment_date}
                                                    </p>

                                                </div>

                                            </div>

                                        </div>

                                        {/* Right */}

                                        <div className="text-right shrink-0 pl-4">

                                            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center justify-end gap-1">
                                                <Wallet className="w-3 h-3 opacity-60" />
                                                Amount Received
                                            </p>

                                            <p className="font-heading font-bold text-xl tabular-nums mt-0.5">
                                                {formatCurrency(
                                                    Number(receipt.amount),
                                                    cur
                                                )}
                                            </p>

                                            <span className="inline-block mt-1 text-xs font-medium text-green-700 bg-green-100 rounded-full px-2.5 py-0.5">
                                                Paids by {receipt.payment_method || invoice?.payment_method || "Unknown"}
                                            </span>
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
                            <ReceiptText className="w-8 h-8 text-muted-foreground" />
                        </div>

                        <p className="text-muted-foreground mb-1">
                            {searchQuery ? "No receipts match your search" : "No receipts found"}
                        </p>

                        <p className="text-sm text-muted-foreground">
                            Receipts will appear here once invoice
                            payments are received.
                        </p>

                    </div>
                )}

            </div>
        </div>
    );
}