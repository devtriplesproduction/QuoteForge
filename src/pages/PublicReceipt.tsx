import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getRepo } from "@/repo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/contexts/AppContext";
import { type BrandKit, type Receipt, type Invoice, type InvoiceItem } from "@/lib/types";
import { ReceiptLayout } from "@/components/documents/ReceiptLayout";

const RECEIPT_LOADING_MESSAGES = [
    "Loading receipt...",
    "Fetching invoice details...",
    "Preparing document...",
];

export default function PublicReceipt() {
    const { receiptId } = useParams<{ receiptId: string }>();
    const { brandKit } = useApp();

    const [initialFetchDone, setInitialFetchDone] = useState(false);
    const [notFoundGraceExpired, setNotFoundGraceExpired] = useState(false);
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [directBrand, setDirectBrand] = useState<BrandKit | null>(null);
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
    const [loadMsgIndex, setLoadMsgIndex] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(0);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const repo = getRepo();
                const kit = await repo.getBrandKit();
                if (!cancelled) setDirectBrand(kit);
            } catch (err) {
                console.error("Failed to load brand kit", err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!receiptId) {
            setInitialFetchDone(true);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const repo = getRepo();
                const rec = await repo.getReceipt(receiptId);
                if (cancelled) return;

                if (rec) {
                    setReceipt(rec);
                    if (rec.invoice_id) {
                        try {
                            const items = await repo.listInvoiceItemsByInvoice(rec.invoice_id);
                            if (!cancelled) setInvoiceItems(items);
                        } catch (err) {
                            console.error("Failed to load invoice items", err);
                        }
                    }
                } else {
                    setReceipt(null);
                }
            } catch (err) {
                console.error("Failed to load public receipt", err);
                if (!cancelled) setReceipt(null);
            } finally {
                if (!cancelled) setInitialFetchDone(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [receiptId]);

    useEffect(() => {
        if (receipt) {
            setNotFoundGraceExpired(false);
            return;
        }
        if (!initialFetchDone) return;
        const t = setTimeout(() => setNotFoundGraceExpired(true), 2500);
        return () => clearTimeout(t);
    }, [receipt, initialFetchDone]);

    useEffect(() => {
        if (receipt) return;
        const interval = setInterval(() => {
            setLoadMsgIndex((i) => (i + 1) % RECEIPT_LOADING_MESSAGES.length);
        }, 1400);
        return () => clearInterval(interval);
    }, [receipt]);

    // Simulated progress: climbs toward 90% while waiting, snaps to 100% once
    // the receipt actually resolves — same pattern as PublicInvoice.tsx.
    const isPageLoading = !receipt && !notFoundGraceExpired;

    useEffect(() => {
        if (!isPageLoading) {
            setLoadingProgress(100);
            const reset = setTimeout(() => setLoadingProgress(0), 400);
            return () => clearTimeout(reset);
        }
        setLoadingProgress(0);
        const interval = setInterval(() => {
            setLoadingProgress((p) => (p >= 90 ? 90 : p + Math.max(1, (90 - p) * 0.1)));
        }, 150);
        return () => clearInterval(interval);
    }, [isPageLoading]);

    const displayBrand = directBrand || brandKit;

    const invoice: Invoice | null | undefined = receipt?.invoice;
    const client = receipt?.client || invoice?.client || null;
    const quotation = invoice?.quotation || null;

    useEffect(() => {
        if (!receipt) return;

        document.title = `${client?.business_name || client?.name || "Client"
            } - ${receipt.receipt_number}`;
    }, [receipt, client]);

    const handleDownloadPdf = async () => {
        if (!receipt) return;
        try {
            const { printDocument } = await import("@/lib/printer");
            const { ReceiptDocument } = await import("@/documents/ReceiptDocument");
            const safe = (receipt.receipt_number || receipt.id).replace(/[^a-zA-Z0-9-_]/g, "_");
            const clientName = (client?.name || client?.business_name || "Client").replace(/[^a-zA-Z0-9-_]/g, "_");
            const dateStr = (receipt.payment_date || new Date().toISOString()).slice(0, 10);

            await printDocument(
                <ReceiptDocument
                    receipt={receipt}
                    invoice={invoice || undefined}
                    client={client}
                    brandKit={displayBrand}
                    quotation={quotation}
                    invoiceItems={invoiceItems}
                />,
                { title: `Receipt_${safe}_${clientName}_${dateStr}` }
            );
        } catch (err) {
            console.error("PDF generation failed", err);
        }
    };

    if (!receiptId) return null;

    if (!receipt) {
        if (!notFoundGraceExpired) {
            const circumference = 2 * Math.PI * 45;
            return (
                <div className="min-h-[60vh] flex flex-col items-center justify-center relative overflow-hidden">
                    <div
                        className="absolute w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-pulse"
                        style={{ animationDuration: "2.4s" }}
                    />

                    <div className="relative w-36 h-36 flex items-center justify-center">
                        <div
                            className="absolute inset-0 rounded-full border-2 border-dashed border-primary/25 animate-spin"
                            style={{ animationDuration: "6s" }}
                        />

                        <svg className="absolute inset-2 -rotate-90" viewBox="0 0 100 100">
                            <defs>
                                <linearGradient id="receiptLoaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
                                stroke="url(#receiptLoaderGradient)"
                                strokeWidth="6"
                                strokeLinecap="round"
                                className="transition-all duration-500 ease-out"
                                strokeDasharray={circumference}
                                strokeDashoffset={circumference * (1 - loadingProgress / 100)}
                                style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))" }}
                            />
                        </svg>

                        <span className="relative font-heading font-bold text-3xl text-foreground tabular-nums transition-all duration-300">
                            {Math.round(loadingProgress)}
                            <span className="text-lg text-muted-foreground">%</span>
                        </span>
                    </div>

                    <div className="mt-8 h-5 relative overflow-hidden">
                        <p
                            key={loadMsgIndex}
                            className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500"
                        >
                            {RECEIPT_LOADING_MESSAGES[loadMsgIndex]}
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="max-w-3xl mx-auto p-6">
                <Card className="glass-card">
                    <CardContent className="p-6">
                        <p className="text-muted-foreground">Receipt not found.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="quotation-preview-page max-w-[1100px] mx-auto p-4 md:p-6 space-y-6" style={{ background: "#ffffff" }}>
            <div className="no-print doc">
                <Button className="rounded-xl" onClick={handleDownloadPdf}>
                    Download Receipt PDF
                </Button>
            </div>

            <ReceiptLayout
                receipt={receipt}
                invoice={invoice}
                client={client}
                brandKit={displayBrand}
                quotation={quotation}
                invoiceItems={invoiceItems}
                mode="screen"
            />
        </div>
    );
}