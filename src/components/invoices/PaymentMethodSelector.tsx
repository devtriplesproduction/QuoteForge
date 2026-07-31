
import { useEffect, useRef, useState } from "react";
import { Banknote, FileText, Globe, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRepo } from "@/repo";

type Method = "Cash" | "Online" | "Cheque";

const METHODS: { id: Method; label: string; icon: typeof Banknote; description: string }[] = [
    { id: "Online", label: "Online", icon: Globe, description: "Pay securely online" },
    { id: "Cash", label: "Cash", icon: Banknote, description: "Pay in person" },
    { id: "Cheque", label: "Cheque", icon: FileText, description: "Pay via cheque" },
];

const PAYMENT_INSTRUCTIONS: Record<Exclude<Method, "Online">, string> = {
    Cash: "Cash payments can be made in person. Please coordinate a time with our team.",
    Cheque: "Please make the cheque payable to Triple S Production and share the reference once sent.",
};

type Props = {
    invoiceId: string;
    invoiceNumber: string;
    clientName?: string | null;
    clientEmail?: string | null;
    paymentNotes?: string | null;
    existingPaymentMethod?: string | null; // invoice.payment_method, so a refresh doesn't lose the client's earlier Cash/Cheque selection
    onPaymentConfirmed?: () => void; // notify parent so it can re-fetch and hide this component
};

declare global {
    interface Window {
        Razorpay: any;
    }
}

function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

export function PaymentMethodSelector({
    invoiceId,
    invoiceNumber,
    clientName,
    clientEmail,
    paymentNotes,
    existingPaymentMethod,
    onPaymentConfirmed,
}: Props) {
    const initialIntent: Method | null =
        existingPaymentMethod === "Cash" || existingPaymentMethod === "Cheque" ? existingPaymentMethod : null;

    const [selected, setSelected] = useState<Method | null>(null);
    const [payingOnline, setPayingOnline] = useState(false);
    const [paymentSubmitted, setPaymentSubmitted] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [payError, setPayError] = useState<string | null>(null);
    const [confirmingIntent, setConfirmingIntent] = useState(false);
    const [intentConfirmed, setIntentConfirmed] = useState<Method | null>(initialIntent);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Once Checkout reports success, poll the invoice until the webhook has
    // actually flipped it to paid (never trust the browser callback alone —
    // see handleOnlinePayment's handler for why).
    useEffect(() => {
        if (!paymentSubmitted) return;

        let attempts = 0;
        const maxAttempts = 20; // ~60s at 3s intervals — Render free tier can be slow

        pollRef.current = setInterval(async () => {
            attempts += 1;
            try {
                const inv = await getRepo().getInvoice(invoiceId);
                if (inv?.invoice_status === "paid") {
                    setConfirmed(true);
                    if (pollRef.current) clearInterval(pollRef.current);
                    onPaymentConfirmed?.();
                }
            } catch {
                // transient fetch errors are fine, just keep polling
            }
            if (attempts >= maxAttempts && pollRef.current) {
                clearInterval(pollRef.current);
            }
        }, 3000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [paymentSubmitted, invoiceId, onPaymentConfirmed]);


    const handleOnlinePayment = async () => {
        setPayError(null);
        setPayingOnline(true);
        try {
            const scriptOk = await loadRazorpayScript();
            if (!scriptOk) throw new Error("Could not load payment gateway. Check your connection.");

            const order = await getRepo().createRazorpayOrder(invoiceId);

            const rzp = new window.Razorpay({
                key: order.key_id,
                amount: order.amount,
                currency: order.currency,
                order_id: order.order_id,
                name: "Triple S Production",
                description: `Invoice ${invoiceNumber}`,
                prefill: {
                    name: clientName || "",
                    email: clientEmail || "",
                },
                // UX-only. The invoice is marked paid by the Razorpay webhook on
                // the backend, never from this callback — a browser-side
                // "success" signal can be spoofed. This just starts the poll above.
                handler: function () {
                    setPaymentSubmitted(true);
                },
                modal: {
                    ondismiss: function () {
                        setPayingOnline(false);
                    },
                },
                theme: { color: "#000000" },
            });

            rzp.on("payment.failed", function () {
                setPayError("Payment failed. You can try again.");
                setPayingOnline(false);
            });

            rzp.open();
        } catch (err) {
            setPayError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setPayingOnline(false);
        }
    };

    const confirmIntent = async (method: Exclude<Method, "Online">) => {
        setConfirmingIntent(true);
        setPayError(null);
        try {
            await getRepo().setInvoicePaymentIntent(invoiceId, method);
            setIntentConfirmed(method);
            onPaymentConfirmed?.();
        } catch (err) {
            setPayError(err instanceof Error ? err.message : "Could not save your selection.");
        } finally {
            setConfirmingIntent(false);
        }
    };

    if (confirmed) {
        return (
            <div className="rounded-2xl border border-border/60 bg-card p-5 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                <p className="font-heading font-bold text-foreground">Payment received</p>
                <p className="text-sm text-muted-foreground mt-1">This invoice has been paid in full.</p>
            </div>
        );
    }

    if (paymentSubmitted) {
        return (
            <div className="rounded-2xl border border-border/60 bg-card p-5 text-center">
                <Loader2 className="w-8 h-8 mx-auto text-muted-foreground mb-2 animate-spin" />
                <p className="font-heading font-bold text-foreground">Confirming your payment</p>
                <p className="text-sm text-muted-foreground mt-1">
                    This page will update automatically once it clears.
                </p>
            </div>
        );
    }

    if (intentConfirmed) {
        return (
            <div className="rounded-2xl border border-border/60 bg-card p-5 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                <p className="font-heading font-bold text-foreground">
                    You selected {intentConfirmed} payment
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                    We'll confirm once your payment is received.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-black/60 bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50">
                <p className="font-heading font-bold text-foreground">How would you like to pay?</p>
                <p className="text-sm text-muted-foreground mt-0.5">Select a payment method to see instructions.</p>
            </div>

            <div className="p-4 grid grid-cols-3 gap-2.5">
                {METHODS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = selected === m.id;
                    const isOnline = m.id === "Online";
                    return (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                                setSelected(isSelected ? null : m.id);
                                setPayError(null);
                                if (!isSelected && isOnline) handleOnlinePayment();
                            }}
                            disabled={payingOnline}
                            className={cn(
                                "relative flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all duration-150",
                                isSelected
                                    ? "border-black bg-black text-white shadow-sm"
                                    : "border-border/60 bg-background hover:border-black/30 hover:bg-secondary/40",
                                payingOnline && isOnline && "opacity-60"
                            )}
                        >
                            {isSelected && !isOnline && (
                                <CheckCircle2 className="absolute top-2.5 right-2.5 w-4 h-4 text-white" />
                            )}
                            {isSelected && isOnline && payingOnline && (
                                <Loader2 className="absolute top-2.5 right-2.5 w-4 h-4 text-white animate-spin" />
                            )}
                            <Icon className={cn("w-5 h-5", isSelected ? "text-white" : "text-foreground")} strokeWidth={2} />
                            <div>
                                <p className="text-sm font-semibold">{m.label}</p>
                                <p className={cn("text-[11px] mt-0.5", isSelected ? "text-white/70" : "text-muted-foreground")}>
                                    {m.description}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {payError && (
                <div className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {payError}
                </div>
            )}

            {selected && selected !== "Online" && (
                <div className="mx-4 mb-4 rounded-xl border border-border/60 bg-secondary/30 p-4 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
                            {selected} Instructions
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                            {PAYMENT_INSTRUCTIONS[selected]}
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={confirmingIntent}
                        onClick={() => confirmIntent(selected)}
                        className="w-full rounded-xl bg-black text-white text-sm font-semibold py-2.5 hover:bg-black/90 disabled:opacity-60 transition-colors"
                    >
                        {confirmingIntent ? "Saving..." : `Select ${selected} Payment`}
                    </button>
                </div>
            )}

            {paymentNotes && (
                <div className="mx-4 mb-4 rounded-xl border border-dashed border-border/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
                        Additional Payment Notes
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{paymentNotes}</p>
                </div>
            )}
        </div>
    );
}