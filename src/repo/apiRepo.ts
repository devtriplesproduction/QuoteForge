import type { Repository } from "./repository";
import type {
    BrandKit,
    Client,
    Service,
    Quotation,
    Invoice,
    InvoiceItem,
    Receipt,
    ClientOptions,
    Notification,
} from "@/lib/types";
import type { RepoSnapshot, QuotationPointTemplateRow } from "./types";



/**
 * API Repository Pattern
 * 
 * Implements the Repository interface by making HTTP requests to the backend API.
 * This replaces local IndexedDB calls when running in production/hybrid mode.
 */

import { getAuthToken, clearAuthToken } from "@/lib/auth";

const API_BASE = "https://quoteforge-mvph.onrender.com/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    // Cache-bust so the browser never has anything to conditionally-revalidate
    // against (which was causing 304 Not Modified responses with empty bodies).
    const separator = path.includes("?") ? "&" : "?";
    const bustedPath = `${path}${separator}_t=${Date.now()}`;

    const token = getAuthToken();

    const res = await fetch(`${API_BASE}${bustedPath}`, {
        ...options,
        cache: "no-store",
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options?.headers,
        },
    });

    if (res.status === 401 || res.status === 403) {
        clearAuthToken();
        if (!window.location.pathname.startsWith("/auth") && !window.location.pathname.startsWith("/public")) {
            window.location.href = "/auth";
        }
        throw new Error("Session expired. Please log in again.");
    }

    if (!res.ok) {
        const errorText = await res.text();
        console.error("API ERROR RESPONSE:", errorText);

        throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    if (res.status === 204 || res.status === 304) {
        return {} as T;
    }

    const text = await res.text();

    if (!text) {
        return {} as T;
    }

    return JSON.parse(text);
}

export function createApiRepo(): Repository {
    return {
        // --- Snapshot Utilities ---
        // In API mode, clearAll might act differently or be disabled. For now, we stub it or map to a reset endpoint.
        clearAll: () => request<void>("/nuke", { method: "POST" }),
        exportJson: () => request<RepoSnapshot>("/backup/export"),
        importJson: (data) => request<void>("/backup/import", { method: "POST", body: JSON.stringify(data) }),

        // --- Brand Kit ---
        getBrandKit: () => request<BrandKit | null>("/brand-kit"),
        upsertBrandKit: (kit) => request<void>("/brand-kit", { method: "POST", body: JSON.stringify(kit) }),

        // --- Clients ---
        listClients: () => request<Client[]>("/clients"),
        createClient: (client) => request<void>("/clients", { method: "POST", body: JSON.stringify(client) }),
        updateClient: (client) => request<void>(`/clients/${client.id}`, { method: "PUT", body: JSON.stringify(client) }),
        getClientOptions: () => request<ClientOptions | null>("/clients/options"),
        setClientOptions: (opts) => request<void>("/clients/options", { method: "POST", body: JSON.stringify(opts) }),
        deleteClient: (id) => request<void>(`/clients/${id}`, { method: "DELETE" }),

        // --- Services ---
        listServices: () => request<Service[]>("/services"),

        listTermsConditions: async () => {
            const response = await request<any[]>("/services/terms-conditions");


            // console.log("API TERMS:", response);

            return response;
        },
        createService: (service) => request<void>("/services", { method: "POST", body: JSON.stringify(service) }),
        // updateService: (service) => request<void>(`/services/${service.id}`, { method: "PUT", body: JSON.stringify(service) }),
        // updateService: (service) => {

        //     console.log("SERVICE SENT");
        //     console.log(service);

        //     return request<void>(
        //         `/services/${service.id}`,
        //         {
        //             method: "PUT",
        //             body: JSON.stringify(service)
        //         }
        //     );

        // },

        updateService: (service) => {

            console.log("SERVICE OBJECT");
            console.log(service);

            const body = JSON.stringify(service);

            console.log("BODY");
            console.log(body);

            return request(
                `/services/${service.id}`,
                {
                    method: "PUT",
                    body
                }
            );
        },
        deleteService: (id) => request<void>(`/services/${id}`, { method: "DELETE" }),

        // --- Quotations ---
        listQuotations: () => request<Quotation[]>("/quotations"),
        getQuotation: (id) => request<Quotation | null>(`/quotations/${id}`),
        createQuotation: (q) => request<void>("/quotations", { method: "POST", body: JSON.stringify(q) }),
        updateQuotation: (q) => request<void>(`/quotations/${q.id}`, { method: "PUT", body: JSON.stringify(q) }),
        deleteQuotation: (id) => request<void>(`/quotations/${id}`, { method: "DELETE" }),

        // --- Invoices & Items ---
        // --- Invoices & Items ---
        listInvoices: () => request<Invoice[]>("/invoices"),
        getInvoice: (id) => request<Invoice | null>(`/invoices/${id}`),
        createInvoice: (inv) => request<void>("/invoices", { method: "POST", body: JSON.stringify(inv) }),
        updateInvoice: (inv) => request<void>(`/invoices/${inv.id}`, { method: "PUT", body: JSON.stringify(inv) }),
        deleteInvoice: (id) => request<void>(`/invoices/${id}`, { method: "DELETE" }),

        listInvoiceItems: () => request<InvoiceItem[]>("/invoice-items"),
        listInvoiceItemsByInvoice: (id) => request<InvoiceItem[]>(`/invoices/${id}/items`),
        upsertInvoiceItemsForInvoice: (id, items) => request<void>(`/invoices/${id}/items`, { method: "PUT", body: JSON.stringify(items) }),

        createRazorpayOrder: (invoiceId) =>
            request(`/invoices/${invoiceId}/razorpay-order`, { method: "POST" }),

        setInvoicePaymentIntent: (invoiceId, method) =>
            request(`/invoices/${invoiceId}/payment-intent`, {
                method: "POST",
                body: JSON.stringify({ payment_method: method }),
            }),

        // --- Receipts ---

        listReceipts: () => request<Receipt[]>("/receipts"),
        getReceipt: (id) => request<Receipt | null>(`/receipts/${id}`),
        createReceipt: (r) => request<void>("/receipts", { method: "POST", body: JSON.stringify(r) }),

        // --- Templates ---
        listQuotationPointTemplates: () => request<QuotationPointTemplateRow[]>("/templates/quotation-points"),
        createQuotationPointTemplate: (t) => request<void>("/templates/quotation-points", { method: "POST", body: JSON.stringify(t) }),
        updateQuotationPointTemplate: (t) => request<void>(`/templates/quotation-points/${t.id}`, { method: "PUT", body: JSON.stringify(t) }),
        updateQuotationPointTemplates: (list) => request<void>("/templates/quotation-points/batch", { method: "PUT", body: JSON.stringify(list) }),
        deleteQuotationPointTemplate: (id) => request<void>(`/templates/quotation-points/${id}`, { method: "DELETE" }),

        // --- Phase 4 Workflow Entities ---
        listContracts: () => request("/contracts"),
        createContract: (c) => request<void>("/contracts", { method: "POST", body: JSON.stringify(c) }),
        updateContract: (c) => request<void>(`/contracts/${c.id}`, { method: "PUT", body: JSON.stringify(c) }),
        listNotifications: () =>
            request<Notification[]>("/notifications"),
        checkDueDateNotifications: () => request<{ success: boolean; notifications_created: number }>("/notifications/check-due-dates"),
        markNotificationRead: (id: string) =>
            request<void>(`/notifications/${id}/read`, { method: "PUT" }),
        markAllNotificationsRead: () =>
            request<void>("/notifications/read-all", { method: "PUT" }),
        createNotification: (notif) =>
            request<void>("/notifications", { method: "POST", body: JSON.stringify(notif) }),

        deleteNotification: (id: string) =>
            request<void>(`/notifications/${id}`, { method: "DELETE" }),
        clearReadNotifications: () =>
            request<void>("/notifications/clear-read", { method: "DELETE" }),
        
        listWorkflowInvoices: () => request("/workflow-invoices"),
        createWorkflowInvoice: (inv) => request<void>("/workflow-invoices", { method: "POST", body: JSON.stringify(inv) }),
        updateWorkflowInvoice: (inv) => request<void>(`/workflow-invoices/${inv.id}`, { method: "PUT", body: JSON.stringify(inv) }),

        listPaymentReceipts: () => request("/payment-receipts"),
        createPaymentReceipt: (r) => request<void>("/payment-receipts", { method: "POST", body: JSON.stringify(r) }),

    };
}
