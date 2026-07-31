// NOTE ON IMPORT PATHS:
// This file was generated outside your repo, so the exact alias paths for
// `formatCurrency`, `RichTextDisplay`, the `BrandKit` / `Client` / `Quotation`
// types, `DEFAULT_PAYMENT_TERMS` / `DEFAULT_TERMS_CONDITIONS`, and
// `getQuotationServiceBlocks` / `getQuotationTotalsForDisplay` are not visible
// to me. I've mirrored the paths used by the sibling `QuotationDocument.tsx`
// as closely as I could infer them below — adjust the path strings only
// (left-hand side identifiers are untouched) to match your project if they
// don't resolve.

import React from "react";
import { formatCurrency } from "@/lib/types";
import type { BrandKit, Client, Quotation } from "@/lib/types";
import { RichTextDisplay } from "@/components/ui/RichText";

import {
    DEFAULT_PAYMENT_TERMS,
    DEFAULT_TERMS_CONDITIONS,
} from "@/lib/quotationDefaults";
import {
    getQuotationServiceBlocks,
    getQuotationTotalsForDisplay,
} from "@/lib/quotationServiceBlocks";

type Props = {
    quotation: Quotation;
    client?: Client | null;
    brandKit?: BrandKit | null;
};

function formatDate(value?: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

export default function ProfessionalQuotationDocument({
    quotation,
    client,
    brandKit,
}: Props) {
    // Referenced so payment/terms defaults and totals helpers stay wired up
    // for the pages that follow this one; not rendered on Page 1.
    // console.log("Quotation", quotation);
    // console.log("Client", client);
    // console.log("Quotation.client", quotation.client);


    // const currentClient = quotation.client ?? client;
    const currentClient = (quotation as any)?.client || client || null;
    // console.log("Current Clients: ", currentClient)
    void DEFAULT_PAYMENT_TERMS;
    void DEFAULT_TERMS_CONDITIONS;
    void getQuotationTotalsForDisplay;

    const serviceBlocks = getQuotationServiceBlocks(quotation);
    const primaryService = serviceBlocks?.[0];

    const companyName = brandKit?.company_name || "Triple S Production";
    const companyTagline = "";

    const quoteNumber = quotation.quotation_number || "QT-0000";

    const clientRows: { label: string; value: React.ReactNode }[] = [
        { label: "Client Name", value: currentClient?.name || "—" },
        { label: "Company", value: currentClient?.business_name || "—" },
        { label: "Contact Number", value: currentClient?.phone || "—" },
        { label: "Email Address", value: currentClient?.email || "—" },
        {
            label: "Address",
            value: currentClient?.address || currentClient?.location || "—",
        },
    ];

    // const clientRows = [
    //     {
    //         label: "Client Name",
    //         value: JSON.stringify(currentClient),
    //     },
    //     {
    //         label: "Company",
    //         value: currentClient?.business_name,
    //     },
    //     {
    //         label: "Contact Number",
    //         value: currentClient?.phone,
    //     },
    //     {
    //         label: "Email Address",
    //         value: currentClient?.email,
    //     },
    //     {
    //         label: "Address",
    //         value: currentClient?.address,
    //     },
    // ];

    const projectOverview =
        quotation.introduction ||
        `${companyName} is pleased to present this formal quotation for ${serviceBlocks?.length
            ? serviceBlocks.map((service) => service.service_name).join(", ").toLowerCase()
            : primaryService?.service_name || "General Services"
        }, prepared specifically for ${currentClient?.business_name || currentClient?.name || "the client"
        }. The scope, deliverables, and detailed breakdown are outlined on the following pages of this proposal.`;

    console.log("payment_terms_text:", quotation.payment_terms_text);
    console.log("quotation:", quotation);

    return (
        <div
            data-quotation-doc
            className="bg-white text-gray-800 mx-auto w-full"
            style={{
                maxWidth: "210mm",
                minHeight: "297mm",
                fontFamily: "var(--font-body, 'Helvetica Neue', Arial, sans-serif)",
            }}
        >
            <div className="px-14 pt-10 pb-14 flex flex-col h-full">
                {/* Top Header */}
                <div className="flex justify-between items-start pb-4">
                    <div className="flex items-start gap-3">
                        {brandKit?.logo_url ? (
                            <img
                                src={brandKit.logo_url}
                                alt="Logo"
                                className="h-10 w-10 object-contain border border-gray-300"
                            />
                        ) : (
                            <div className="h-10 w-10 border border-gray-300 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700">
                                    <rect x="3" y="4" width="18" height="2" fill="currentColor" />
                                    <rect x="3" y="11" width="12" height="2" fill="currentColor" />
                                    <rect x="3" y="18" width="18" height="2" fill="currentColor" />
                                </svg>
                            </div>
                        )}
                        <div>
                            <p
                                className="text-[15px] font-bold tracking-wide text-gray-900 leading-tight"
                                style={{ fontFamily: "var(--font-heading, inherit)" }}
                            >
                                {companyName.toUpperCase()}
                            </p>
                            <p className="text-[10px] tracking-wide text-gray-400 mt-0.5">
                                {companyTagline.toUpperCase()}
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-[12px] font-bold tracking-wide text-gray-900">
                            QT-{quoteNumber.replace(/^QT-/i, "").slice(-6)}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                            Date:{" "}
                            <span className="text-gray-500">
                                {formatDate(quotation.quote_date)}
                            </span>
                        </p>
                        <p className="text-[10px] text-gray-400">
                            Valid Until:{" "}
                            <span className="text-gray-500">
                                {formatDate(quotation.valid_until)}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t-2 border-gray-900 mb-14" />

                {/* Title Block */}
                <div className="text-center mb-14">
                    <p className="text-[10px] tracking-[0.3em] text-gray-400 mb-3">
                        FORMAL PROPOSAL
                    </p>
                    <h1
                        className="text-[40px] tracking-[0.35em] text-gray-900 font-light"
                        style={{ fontFamily: "var(--font-heading, inherit)" }}
                    >
                        QUOTATION
                    </h1>
                    <div className="flex items-center justify-center gap-2 mt-5">
                        <span className="h-px w-10 bg-gray-300" />
                        <span className="h-1 w-1 rotate-45 bg-gray-300" />
                        <span className="h-px w-10 bg-gray-300" />
                    </div>
                </div>

                {/* Client Information */}
                <div className="border border-gray-200 mb-10">
                    <div className="bg-gray-50 border-b border-gray-200 px-5 py-2">
                        <p
                            className="text-[10px] tracking-[0.2em] text-black-600 font-bold"
                        >
                            CLIENT INFORMATION
                        </p>
                    </div>
                    {clientRows.map((row, idx) => (

                        <div
                            key={row.label}
                            className={`flex px-5 py-3 ${idx !== clientRows.length - 1 ? "border-b border-gray-200" : ""
                                }`}
                        >
                            <span className="w-40 shrink-0 text-[10px] tracking-[0.15em] text-gray-400">
                                {row.label.toUpperCase()}
                            </span>
                            <span className="text-[12px] text-gray-800">{row.value}</span>
                        </div>

                    ))}


                </div>

                {/* Service Type */}
                <div className="mb-8">
                    <p className="text-[10px] tracking-[0.2em] text-gray-400 mb-2">
                        SERVICE TYPE
                    </p>

                    <p className="text-[15px] font-bold text-gray-900">
                        {serviceBlocks?.length
                            ? serviceBlocks.map((service) => service.service_name).join(", ")
                            : primaryService?.service_name || "General Services"}
                    </p>
                </div>


                {/* Project Overview */}
                <div className="mb-8">
                    <p className="text-[10px] tracking-[0.2em] text-gray-400 mb-2">
                        PROJECT OVERVIEW
                    </p>
                    <p className="text-[12px] leading-[1.9] text-gray-600 whitespace-pre-wrap">
                        {projectOverview}
                    </p>
                </div>

                {/* Note */}
                <div className="border-l-2 border-gray-900 bg-gray-50 px-4 py-3">
                    <p className="text-[10px] tracking-[0.2em] text-gray-400 mb-1">
                        NOTE
                    </p>
                    <p className="text-[11px] leading-[1.8] text-gray-600">
                        This quotation covers the complete scope as detailed in the
                        Scope of Work on the following pages. All features, pages,
                        integrations, and training are included under the quoted price
                        unless stated otherwise. Any requirements beyond the agreed scope
                        will be communicated in writing via a formal Change Request prior
                        to commencement.
                    </p>
                </div>

                {/* Reference to keep RichTextDisplay / formatCurrency wired for later pages */}
                <div className="hidden">
                    <RichTextDisplay content="" />
                    <span>{formatCurrency(0, quotation.currency)}</span>
                </div>
            </div>
            {/* ===================== PAGE 2 ===================== */}
            <div
                data-quotation-doc-page="2"
                className="bg-white text-gray-800 mx-auto"
                style={{
                    width: "210mm",
                    minHeight: "297mm",
                    fontFamily: "var(--font-body, 'Helvetica Neue', Arial, sans-serif)",
                }}
            >
                <div className="px-14 pt-10 pb-14 flex flex-col h-full">
                    {/* Top Header (repeated) */}
                    <div className="flex justify-between items-start pb-4">
                        <div className="flex items-start gap-3">
                            {brandKit?.logo_url ? (
                                <img
                                    src={brandKit.logo_url}
                                    alt="Logo"
                                    className="h-10 w-10 object-contain border border-gray-300"
                                />
                            ) : (
                                <div className="h-10 w-10 border border-gray-300 flex items-center justify-center">
                                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700">
                                        <rect x="3" y="4" width="18" height="2" fill="currentColor" />
                                        <rect x="3" y="11" width="12" height="2" fill="currentColor" />
                                        <rect x="3" y="18" width="18" height="2" fill="currentColor" />
                                    </svg>
                                </div>
                            )}
                            <div>
                                <p
                                    className="text-[15px] font-bold tracking-wide text-gray-900 leading-tight"
                                    style={{ fontFamily: "var(--font-heading, inherit)" }}
                                >
                                    {companyName.toUpperCase()}
                                </p>
                                <p className="text-[10px] tracking-wide text-gray-400 mt-0.5">
                                    {companyTagline.toUpperCase()}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-[12px] font-bold tracking-wide text-gray-900">
                                QT-{quoteNumber.replace(/^QT-/i, "").slice(-6)}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                                Date:{" "}
                                <span className="text-gray-500">
                                    {formatDate(quotation.quote_date)}
                                </span>
                            </p>
                            <p className="text-[10px] text-gray-400">
                                Valid Until:{" "}
                                <span className="text-gray-500">
                                    {formatDate(quotation.valid_until)}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t-2 border-gray-900 mb-10" />

                    {/* Section Title */}
                    <div className="mb-8">
                        <p className="text-[10px] tracking-[0.2em] text-gray-400 mb-1">
                            DELIVERABLES
                        </p>
                        <h2
                            className="text-[22px] font-bold text-gray-900 tracking-wide"
                            style={{ fontFamily: "var(--font-heading, inherit)" }}
                        >
                            SCOPE OF WORK
                        </h2>
                    </div>

                    {/* Scope of Work sections, driven by serviceBlocks */}
                    <div className="flex flex-col">
                        {(serviceBlocks && serviceBlocks.length > 0
                            ? serviceBlocks
                            : [
                                {
                                    service_id: "dummy-1",
                                    service_name: "Website Pages Included",
                                    description: "",
                                    scope_of_work: "...",
                                    deliverables: "",
                                    timeline: "",
                                    price: 0,
                                },
                                {
                                    service_name: "Payment Integration",
                                    scope_of_work:
                                        "Razorpay Integration\nSecure SSL Encrypted Checkout\nUPI, Debit/Credit Card, Net Banking & Wallets\nAutomated Order Confirmation Emails",
                                },
                                {
                                    service_name: "Shipping Integration",
                                    scope_of_work:
                                        "XpressBees Shipping Integration\nShipping Label Generation\nDelivery Status Management\nAutomated Order Sync\nLive Tracking Integration",
                                },
                                {
                                    service_name: "Shopping Features",
                                    scope_of_work:
                                        "Add to Cart\nCoupon Code System\nCustomer Login & Dashboard\nRelated Products Section\nWishlist\nGuest Checkout\nOrder History Tracking\nMobile-Optimised Checkout",
                                },
                                {
                                    service_name: "Marketing & Performance",
                                    scope_of_work:
                                        "Basic On-Page SEO Setup\nGoogle Analytics Integration\nSpeed Optimisation",
                                },
                                {
                                    service_name: "E-Commerce Admin Training",
                                    scope_of_work:
                                        "Complete Admin Panel Training\nOrder Processing Training\nPayment Tracking Guidance\nProduct Upload Training\nShipping Management Training",
                                },
                            ]
                        ).map((s, idx) => {
                            const items = (s.scope_of_work || s.deliverables || "dummy item")
                                .split("\n")
                                // .map((i) => i.trim())
                                .map((i: string) => i.trim())
                                .filter(Boolean);
                            const mid = Math.ceil(items.length / 2);
                            const colOne = items.slice(0, mid);
                            const colTwo = items.slice(mid);

                            return (
                                <div
                                    //   key={`${s.service_id ?? idx}-${idx}`}
                                    key={`${idx}-${s.service_name}`}
                                    className={`flex gap-5 py-5 ${idx !== 0 ? "border-t border-gray-100" : ""
                                        }`}
                                >
                                    <span className="text-[10px] text-gray-300 font-semibold pt-0.5 w-6 shrink-0">
                                        {String(idx + 1).padStart(2, "0")}
                                    </span>
                                    <div className="flex-1">
                                        <h3 className="text-[12px] font-bold text-gray-900 tracking-wide mb-3">
                                            {s.service_name?.toUpperCase()}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                                            <ul className="space-y-1.5">
                                                {colOne.map((item: string, i: number) => (
                                                    <li
                                                        key={i}
                                                        className="text-[11px] text-gray-500 flex gap-2"
                                                    >
                                                        <span className="text-gray-300">·</span>
                                                        <RichTextDisplay
                                                            content={item}
                                                            className="text-[11px] text-gray-500"
                                                        />
                                                    </li>
                                                ))}
                                            </ul>
                                            <ul className="space-y-1.5">
                                                {colTwo.map((item: string, i: number) => (
                                                    <li
                                                        key={i}
                                                        className="text-[11px] text-gray-500 flex gap-2"
                                                    >
                                                        <span className="text-gray-300">·</span>
                                                        <RichTextDisplay
                                                            content={item}
                                                            className="text-[11px] text-gray-500"
                                                        />
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Project Timeline */}
                        {/* Project Timeline — one line per service, using each service's own timeline */}
                        <div className="flex gap-5 py-5 border-t border-gray-100">
                            <span className="text-[10px] text-gray-300 font-semibold pt-0.5 w-6 shrink-0">
                                {String(
                                    (serviceBlocks && serviceBlocks.length > 0
                                        ? serviceBlocks.length
                                        : 6) + 1
                                ).padStart(2, "0")}
                            </span>
                            <div className="flex-1">
                                <h3 className="text-[12px] font-bold text-gray-900 tracking-wide mb-3">
                                    PROJECT TIMELINE
                                </h3>
                                <ul className="space-y-1.5">
                                    {(serviceBlocks && serviceBlocks.length > 0
                                        ? serviceBlocks
                                        : []
                                    ).map((s, idx) => (
                                        <li
                                            key={`timeline-${s.service_id ?? idx}`}
                                            className="text-[11px] text-gray-500 flex gap-2"
                                        >
                                            <span className="text-gray-300">·</span>
                                            <span>
                                                {s.service_name || "Service"}:{" "}
                                                {s.timeline || "Timeline to be confirmed"}
                                            </span>
                                        </li>
                                    ))}
                                    <li className="text-[11px] text-gray-500 flex gap-2">
                                        <span className="text-gray-300">·</span>
                                        <span>
                                            Timelines are subject to client feedback, content
                                            approval, and response time.
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* =================== END PAGE 2 =================== */}

            {/* ===================== PAGE 3 ===================== */}
            <div
                data-quotation-doc-page="3"
                className="bg-white text-gray-800 mx-auto"
                style={{
                    width: "210mm",
                    minHeight: "297mm",
                    fontFamily: "var(--font-body, 'Helvetica Neue', Arial, sans-serif)",
                }}
            >
                <div className="px-14 pt-10 pb-14 flex flex-col h-full">
                    {/* Top Header (repeated) */}
                    <div className="flex justify-between items-start pb-4">
                        <div className="flex items-start gap-3">
                            {brandKit?.logo_url ? (
                                <img
                                    src={brandKit.logo_url}
                                    alt="Logo"
                                    className="h-10 w-10 object-contain border border-gray-300"
                                />
                            ) : (
                                <div className="h-10 w-10 border border-gray-300 flex items-center justify-center">
                                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700">
                                        <rect x="3" y="4" width="18" height="2" fill="currentColor" />
                                        <rect x="3" y="11" width="12" height="2" fill="currentColor" />
                                        <rect x="3" y="18" width="18" height="2" fill="currentColor" />
                                    </svg>
                                </div>
                            )}
                            <div>
                                <p
                                    className="text-[15px] font-bold tracking-wide text-gray-900 leading-tight"
                                    style={{ fontFamily: "var(--font-heading, inherit)" }}
                                >
                                    {companyName.toUpperCase()}
                                </p>
                                <p className="text-[10px] tracking-wide text-gray-400 mt-0.5">
                                    {companyTagline.toUpperCase()}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-[12px] font-bold tracking-wide text-gray-900">
                                QT-{quoteNumber.replace(/^QT-/i, "").slice(-6)}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                                Date:{" "}
                                <span className="text-gray-500">
                                    {formatDate(quotation.quote_date)}
                                </span>
                            </p>
                            <p className="text-[10px] text-gray-400">
                                Valid Until:{" "}
                                <span className="text-gray-500">
                                    {formatDate(quotation.valid_until)}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t-2 border-gray-900 mb-10" />

                    {/* Payment Terms */}
                    {/* <div className="mb-8">
                        <p className="text-[10px] tracking-[0.2em] text-gray-400 mb-2">
                            PAYMENT TERMS
                        </p>
                        {quotation.payment_terms_text ? (
                            <RichTextDisplay
                                content={quotation.payment_terms_text}
                                className="text-[11px] text-gray-600 leading-[1.9]"
                            />
                        ) : (
                            <ol className="space-y-1.5 list-decimal list-inside">
                                <li className="text-[11px] text-gray-600">
                                    70% advance payment is required upfront to initiate the project.
                                </li>
                                <li className="text-[11px] text-gray-600">
                                    30% balance payment is due upon final delivery and handover of
                                    the completed website.
                                </li>
                                <li className="text-[11px] text-gray-600">
                                    An optional hosting &amp; maintenance package may be purchased
                                    after project delivery.
                                </li>
                            </ol>
                        )}
                    </div> */}

                    {/* Payment Terms */}
                    {quotation.payment_terms_text ? (
                        <div className="mb-8">
                            <p className="text-[10px] tracking-[0.2em] text-gray-400 mb-2">
                                PAYMENT TERMS
                            </p>
                            <RichTextDisplay
                                content={quotation.payment_terms_text}
                                className="text-[11px] text-gray-600 leading-[1.9]"
                            />
                        </div>
                    ) : null}

                    {/* Terms & Conditions */}
                    {/* Terms & Conditions */}
                    {quotation.terms_conditions_text ? (
                        <div className="mb-10">
                            <p className="text-[10px] tracking-[0.2em] text-gray-400 mb-2">
                                TERMS &amp; CONDITIONS
                            </p>
                            <RichTextDisplay
                                content={quotation.terms_conditions_text}
                                className="text-[11px] text-gray-600 leading-[1.9]"
                            />
                        </div>
                    ) : null}

                    {/* Hosting & Maintenance Plan */}
                    <div className="border border-gray-200 mb-8">
                        <div className="bg-gray-50 border-b border-gray-200 px-5 py-2">
                            <p className="text-[10px] tracking-[0.2em] text-gray-400 font-semibold">
                                HOSTING &amp; MAINTENANCE PLAN
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 px-5 py-4">
                            <div>
                                <h4 className="text-[11px] font-bold text-gray-900 tracking-wide mb-2">
                                    FIRST 3 MONTHS — INCLUDED
                                </h4>
                                <ul className="space-y-1.5">
                                    {[
                                        "Website uptime monitoring",
                                        "Technical support & bug fixing",
                                        "Plugin & security updates",
                                        "Minor text / image edits",
                                        "WhatsApp / contact support",
                                        "Backup & performance checks",
                                    ].map((item) => (
                                        <li
                                            key={item}
                                            className="text-[11px] text-gray-500 flex gap-2"
                                        >
                                            <span className="text-gray-300">·</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="border-l border-gray-100 pl-8">
                                <h4 className="text-[11px] font-bold text-gray-900 tracking-wide mb-2">
                                    POST 3-MONTH PLANS
                                </h4>
                                <ul className="space-y-1.5">
                                    <li className="flex justify-between text-[11px]">
                                        <span className="text-gray-500">Monthly Plan</span>
                                        <span className="text-gray-800 font-semibold">
                                            {formatCurrency(1000, quotation.currency)} / month
                                        </span>
                                    </li>
                                    <li className="flex justify-between text-[11px]">
                                        <span className="text-gray-500">Half-Year Plan</span>
                                        <span className="text-gray-800 font-semibold">
                                            {formatCurrency(5000, quotation.currency)} / 6 Months
                                        </span>
                                    </li>
                                    <li className="flex justify-between text-[11px]">
                                        <span className="text-gray-500">Annual AMC Plan</span>
                                        <span className="text-gray-800 font-semibold">
                                            {formatCurrency(10000, quotation.currency)} / Year
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>


                    {/* Section Title */}
                    <div className="mb-6">
                        <p className="text-[10px] tracking-[0.2em] text-gray-400 mb-1">
                            PRICING &amp; TERMS
                        </p>
                        <h2
                            className="text-[22px] font-bold text-gray-900 tracking-wide"
                            style={{ fontFamily: "var(--font-heading, inherit)" }}
                        >
                            COMMERCIAL DETAILS
                        </h2>
                    </div>

                    {/* Commercial Summary Table */}
                    <div className="border border-gray-200 mb-8">
                        <div className="grid grid-cols-[2fr_3fr_1.2fr_1.2fr] bg-gray-50 border-b border-gray-200">
                            <div className="px-4 py-2 text-[9px] tracking-[0.15em] text-gray-400">
                                SERVICE
                            </div>
                            <div className="px-4 py-2 text-[9px] tracking-[0.15em] text-gray-400">
                                DESCRIPTION
                            </div>
                            <div className="px-4 py-2 text-[9px] tracking-[0.15em] text-gray-400 text-right">
                                ORIGINAL PRICE
                            </div>
                            <div className="px-4 py-2 text-[9px] tracking-[0.15em] text-gray-400 text-right">
                                DISCOUNTED PRICE
                            </div>
                        </div>

                        {(serviceBlocks && serviceBlocks.length > 0
                            ? serviceBlocks
                            : [
                                {
                                    service_name: "Complete Website Development",
                                    description: "All pages, integrations & features as per scope",
                                    price: 45000,
                                    discounted_price: 39999,
                                },
                                {
                                    service_name: "Additional Page (Per Page)",
                                    description: "Any page beyond the agreed scope of work",
                                    price: 2000,
                                    discounted_price: 1699,
                                },
                            ]
                        ).map((s, idx, arr) => (
                            <div
                                key={`${idx}-${s.service_name}`}
                                className={`grid grid-cols-[2fr_3fr_1.2fr_1.2fr] ${idx !== arr.length - 1 ? "border-b border-gray-200" : ""
                                    }`}
                            >
                                <div className="px-4 py-3 text-[11px] font-bold text-gray-900">
                                    {s.service_name}
                                </div>
                                <div className="px-4 py-3 text-[11px] text-gray-500">
                                    <RichTextDisplay
                                        content={s.description || "—"}
                                        className="text-[11px] text-gray-500"
                                    />
                                </div>
                                <div className="px-4 py-3 text-[11px] text-gray-400 text-right line-through">
                                    {formatCurrency(s.price ?? 0, quotation.currency)}
                                </div>
                                <div className="px-4 py-3 text-[12px] font-bold text-gray-900 text-right">
                                    {formatCurrency(
                                        Math.max(0, Number(s.price ?? 0) - Number((s as any).discount_amount ?? 0)),
                                        quotation.currency
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Commercial Summary Totals */}
                    {/* Commercial Summary Totals */}
                    {(() => {
                        const totals = getQuotationTotalsForDisplay(quotation);

                        // Sum each service block's own discount_amount — this is the
                        // source of truth set per-service in the builder's Pricing card.
                        const totalDiscount = (serviceBlocks || []).reduce(
                            (sum, s) => sum + Number((s as any).discount_amount ?? 0),
                            0
                        );

                        const grandTotal = Math.max(0, totals.total - totalDiscount);

                        return (
                            <div className="flex justify-end mb-10">
                                <div className="w-full sm:max-w-xs space-y-2">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-gray-400">Subtotal</span>
                                        <span className="text-gray-700">
                                            {formatCurrency(totals.subtotal, quotation.currency)}
                                        </span>
                                    </div>
                                    {totalDiscount > 0 ? (
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-gray-400">Discount</span>
                                            <span className="text-gray-700">
                                                -{formatCurrency(totalDiscount, quotation.currency)}
                                            </span>
                                        </div>
                                    ) : null}
                                    <div className="flex justify-between border-t border-gray-900 pt-2">
                                        <span className="text-[12px] font-bold text-gray-900">
                                            Grand Total
                                        </span>
                                        <span className="text-[14px] font-bold text-gray-900">
                                            {formatCurrency(grandTotal, quotation.currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Contact Information / Signatures */}
                    <div className="border-t border-gray-100 pt-6 grid grid-cols-3 gap-8">
                        <div>
                            <p className="text-[10px] tracking-[0.2em] text-gray-400 mb-2">
                                CONTACT INFORMATION
                            </p>
                            <p className="text-[12px] font-bold text-gray-900 mb-1">
                                {companyName}
                            </p>
                            <div className="text-[11px] text-gray-500 space-y-0.5">
                                <p>{brandKit?.phone || "+91 00000 00000"}</p>
                                <p>{brandKit?.email || "info@triplesproduction.com"}</p>
                                <p>{brandKit?.website || "https://triplesproduction.com/"}</p>
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] tracking-[0.2em] text-gray-400 mb-6">
                                AUTHORIZED SIGNATORY
                            </p>
                            <div className="border-b border-gray-300 h-8" />
                            <p className="text-[10px] text-gray-400 mt-1">Name &amp; Date</p>
                            <p className="text-[10px] text-gray-300 mt-4">
                                Company Stamp
                            </p>
                            <div className="border border-dashed border-gray-200 h-10 w-16 mt-1" />
                        </div>

                        <div>
                            <p className="text-[10px] tracking-[0.2em] text-gray-400 mb-6">
                                CLIENT SIGNATURE
                            </p>
                            <div className="border-b border-gray-300 h-8" />
                            <p className="text-[10px] text-gray-400 mt-1">Name &amp; Date</p>
                        </div>
                    </div>

                    {/* Thank You */}
                    <div className="text-center mt-auto pt-10">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <span className="h-px w-10 bg-gray-300" />
                            <span className="h-1 w-1 rotate-45 bg-gray-300" />
                            <span className="h-px w-10 bg-gray-300" />
                        </div>
                        <p
                            className="text-[16px] tracking-[0.2em] text-gray-900 font-light mb-2"
                            style={{ fontFamily: "var(--font-heading, inherit)" }}
                        >
                            THANK YOU
                        </p>
                        <p className="text-[11px] text-gray-500 mb-3">
                            We appreciate the opportunity to work with{" "}
                            {currentClient?.business_name || currentClient?.name || "you"}.
                        </p>
                        <p className="text-[10px] text-gray-400">
                            {brandKit?.website || "https://triplesproduction.com/"} ·{" "}
                            {brandKit?.email || "info@example.com"} ·{" "}
                            {brandKit?.phone || "+91 00000 00000"}
                        </p>
                    </div>
                </div>
            </div>
            {/* =================== END PAGE 3 =================== */}
        </div>
    );
}