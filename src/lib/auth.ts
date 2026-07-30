const TOKEN_KEY = "qf_auth_token";

export function getAuthToken(): string | null {
    try {
        return sessionStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

export function setAuthToken(token: string): void {
    try {
        sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
        // ignore
    }
}

export function clearAuthToken(): void {
    try {
        sessionStorage.removeItem(TOKEN_KEY);
    } catch {
        // ignore
    }
}

export async function loginWithPassword(password: string): Promise<{ token: string } | { error: string }> {
    const API_BASE = "https://quoteforge-mvph.onrender.com/api";
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return { error: body?.error || "Invalid password" };
        }

        const data = await res.json();
        return { token: data.token };
    } catch (err) {
        return { error: "Network error. Please try again." };
    }
}