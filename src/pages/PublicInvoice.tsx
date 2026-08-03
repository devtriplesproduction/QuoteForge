import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getRepo } from '@/repo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { type BrandKit, type Invoice, type InvoiceItem } from '@/lib/types';
import { InvoiceLayout } from '@/components/documents/InvoiceLayout';
import triplesLogo from "/public/triplesimage.png";
import { PaymentMethodSelector } from '@/components/invoices/PaymentMethodSelector';

const INVOICE_LOADING_MESSAGES = [
  "Loading invoice...",
  "Fetching client details...",
  "Preparing document...",
];

export default function PublicInvoice() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { brandKit, currency, clients, quotations, refreshInvoices, refreshInvoiceItems, getInvoiceById, listInvoiceItemsByInvoice } = useApp();

  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [notFoundGraceExpired, setNotFoundGraceExpired] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadMsgIndex, setLoadMsgIndex] = useState(0);
  const [statelessInvoice, setStatelessInvoice] = useState<Invoice | null>(null);
  const [statelessItems, setStatelessItems] = useState<InvoiceItem[] | null>(null);
  const [statelessBrand, setStatelessBrand] = useState<BrandKit | undefined>(undefined);
  const [directBrand, setDirectBrand] =
    useState<BrandKit | null>(null);

  const usingStatelessData = statelessInvoice !== null;

  // Handle legacy stateless (?data=) links, if any old ones are still floating around.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('data');
    if (!dataParam) {
      setInitialFetchDone(true);
      return;
    }


    import('@/lib/shareLink').then(({ decodeInvoiceData }) => {
      const decoded = decodeInvoiceData(dataParam);
      if (decoded) {
        const { invoice: rawInv, items: rawItems, client, brandKit: sharedBrand } = decoded;
        const hydrated = {
          ...rawInv,
          client: client || rawInv.client,
        } as Invoice;

        setStatelessInvoice(hydrated);
        setStatelessItems(rawItems);
        setStatelessBrand(sharedBrand || undefined);
      }
      setInitialFetchDone(true);
    });
  }, []);

  useEffect(() => {
    if (statelessBrand !== undefined) return;

    let cancelled = false;

    (async () => {
      try {
        const repo = getRepo();
        const kit = await repo.getBrandKit();

        if (!cancelled) {
          setDirectBrand(kit);
        }
      } catch (err) {
        console.error("Failed to load brand kit", err);
      }
    })();

    return () => {

      cancelled = true;
    };
  }, [statelessBrand]);


  // Fetch live data once on mount (short-link path: /public/invoice/:invoiceId, no ?data=).
  const [directInvoice, setDirectInvoice] = useState<Invoice | null>(null);
  const [directItems, setDirectItems] = useState<InvoiceItem[] | null>(null);

  // Fetch live data once on mount (short-link path: /public/invoice/:invoiceId, no ?data=).
  // Uses the repo directly (getInvoice is a public GET route) instead of the
  // protected listInvoices()/listInvoiceItems() used elsewhere in the app —
  // those require auth, which a public visitor never has.
  useEffect(() => {
    if (usingStatelessData) return;
    if (!invoiceId || invoiceId === 'shared') {
      setInitialFetchDone(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const repo = getRepo();
        const inv = await repo.getInvoice(invoiceId);
        if (cancelled) return;

        if (inv) {
          setDirectInvoice(inv);
          const its = await repo.listInvoiceItemsByInvoice(invoiceId);
          if (!cancelled) setDirectItems(its);
        } else {
          setDirectInvoice(null);
        }
      } catch (err) {
        console.error('Failed to load public invoice', err);
        if (!cancelled) setDirectInvoice(null);
      } finally {
        if (!cancelled) setInitialFetchDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, usingStatelessData]);


  // Derive invoice reactively from context — no stale closure.
  // Derive invoice from the direct fetch — client/quotation data usually
  // comes embedded in the backend response already, but fall back to
  // context lists if a signed-in viewer happens to have them loaded.
  const liveInvoice = useMemo<Invoice | null>(() => {
    if (usingStatelessData) return null;
    if (!invoiceId || invoiceId === 'shared') return null;
    if (!directInvoice) return null;

    const inv = directInvoice;
    const q = inv.quotation || (inv.quotation_id ? quotations.find((x) => x.id === inv.quotation_id) : undefined);
    const clientId = inv.client_id || q?.client_id || null;
    const client = inv.client || (clientId ? clients.find((c) => c.id === clientId) : undefined);

    return {
      ...inv,
      client_id: clientId,
      client,
      quotation: q,
    } as Invoice;
  }, [invoiceId, usingStatelessData, directInvoice, quotations, clients]);

  const invoice = usingStatelessData ? statelessInvoice : liveInvoice;

  // Grace period before showing "not found" — give context a moment to catch up
  // after the initial fetch, since state updates can lag one render behind.
  const [retryAttempted, setRetryAttempted] = useState(false);

  // Grace period before showing "not found" — give context a moment to catch up
  // after the initial fetch, since state updates can lag one render behind and
  // the backend can be genuinely slow. Retry once before ever declaring
  // "not found", so a slow response never gets mistaken for a missing invoice.
  useEffect(() => {
    if (invoice) {
      setNotFoundGraceExpired(false);
      return;
    }
    if (!initialFetchDone) return;
    if (usingStatelessData) return;

    if (!retryAttempted) {
      const t = setTimeout(() => {
        setRetryAttempted(true);
        (async () => {
          try {
            const repo = getRepo();
            const inv = await repo.getInvoice(invoiceId!);
            if (inv) {
              setDirectInvoice(inv);
              const its = await repo.listInvoiceItemsByInvoice(invoiceId!);
              setDirectItems(its);
            }
          } catch {
            // If the retry itself fails, the grace timer below will still
            // eventually surface "not found" once it runs.
          }
        })();
      }, 3000);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setNotFoundGraceExpired(true), 4000);
    return () => clearTimeout(t);
  }, [invoice, initialFetchDone, retryAttempted, usingStatelessData, invoiceId]);

  const isPageLoading = !invoice && !notFoundGraceExpired;

  // Simulated progress: climbs toward 90% while waiting, snaps to 100% once
  // the invoice actually resolves.
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

  useEffect(() => {
    if (!isPageLoading) {
      setLoadMsgIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadMsgIndex((i) => (i + 1) % INVOICE_LOADING_MESSAGES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [isPageLoading]);

  const items = useMemo(() => {
    if (statelessItems) return statelessItems;
    if (directItems) return directItems;
    return invoice ? listInvoiceItemsByInvoice(invoice.id) : [];
  }, [invoice, listInvoiceItemsByInvoice, statelessItems, directItems]);

  // Use stateless brand if available, else from context
  const displayBrand =
    statelessBrand !== undefined
      ? statelessBrand
      : (directBrand || brandKit);

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { default: InvoiceDocument } = await import('@/documents/InvoiceDocument');

      const safe = invoice.invoice_number.replace(/[^a-zA-Z0-9-_]/g, "_");
      const clientName = invoice.client?.business_name || invoice.client?.name || "Client";
      const safeClientName = clientName.replace(/[^a-zA-Z0-9-_ ]/g, "").trim();

      const blob = await pdf(
        <InvoiceDocument invoice={invoice} items={items} brandKit={displayBrand} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeClientName} - ${safe}.pdf`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed', err);
    }
  };

  if (!invoiceId) return null;

  if (!invoice) {
    if (!notFoundGraceExpired) {
      const circumference = 2 * Math.PI * 45;
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center relative overflow-hidden">
          <div
            className="absolute w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-pulse"
            style={{ animationDuration: "2.4s" }}
          />

          <div className="relative w-36 h-36 flex items-center justify-center" style={{ aspectRatio: "1 / 1" }}>
            <div
              className="absolute inset-0 rounded-full border-2 border-dashed border-primary/25 animate-spin"
              style={{ animationDuration: "6s" }}
            />

            <svg
              className="absolute -rotate-90"
              viewBox="0 0 100 100"
              style={{ width: "128px", height: "128px", aspectRatio: "1 / 1" }}
            >
              <defs>
                <linearGradient id="invoiceLoaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
                stroke="url(#invoiceLoaderGradient)"
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
              {INVOICE_LOADING_MESSAGES[loadMsgIndex]}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Invoice not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (

    <div className="quotation-preview-page max-w-[1100px] mx-auto p-4 md:p-6 space-y-6 overflow-x-hidden" style={{ background: '#ffffff' }}>
      <div className="no-print flex justify-start" style={{ marginLeft: 0, marginRight: 0 }}>
        <Button className="rounded-xl gap-2" onClick={handleDownloadPdf}>
          <Download className="w-4 h-4" />
          Download Invoice PDF
        </Button>
      </div>

      {invoice.invoice_status !== 'paid' && (
        <div className="no-print doc">
          <PaymentMethodSelector
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoice_number}
            clientName={invoice.client?.business_name || invoice.client?.name}
            clientEmail={invoice.client?.email}
            paymentNotes={invoice.notes}
            existingPaymentMethod={invoice.payment_method}
            onPaymentConfirmed={async () => {
              const repo = getRepo();
              const inv = await repo.getInvoice(invoice.id);
              if (inv) {
                setDirectInvoice(inv);
                const its = await repo.listInvoiceItemsByInvoice(invoice.id);
                setDirectItems(its);
              }
            }}
          />
        </div>
      )}

      <div data-doc-quotation-status={invoice.quotation?.status || 'draft'}>
        <InvoiceLayout invoice={invoice} items={items} brandKit={displayBrand} mode="screen" />
      </div>

      <div className="doc text-xs text-muted-foreground">
        Status: {invoice.status.toUpperCase()} • Amount due: {(invoice.amount_due || 0).toLocaleString()} {invoice.currency || currency}
      </div>
    </div>


  );

}
