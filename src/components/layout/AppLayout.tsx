import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Plus,
  Settings,
  ChevronRight,
  Receipt,
  ReceiptText,   // <-- add
  BarChart3,
  LogOut
} from "lucide-react";

import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { NotificationBell } from "@/components/NotificationBell";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Analytics', href: '/analytics', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Clients', href: '/clients', icon: <Users className="w-5 h-5" /> },
  { label: 'Services', href: '/services', icon: <Package className="w-5 h-5" /> },
  { label: 'Quotations', href: '/quotations', icon: <FileText className="w-5 h-5" /> },
  { label: 'Invoices', href: '/invoices', icon: <Receipt className="w-5 h-5" /> },
  { label: 'Receipts', href: '/receipts', icon: <ReceiptText className="w-5 h-5" /> },
];

const LOADING_MESSAGES = [
  "Waking things up...",
  "Fetching your clients...",
  "Loading services...",
  "Preparing quotations...",
  "Syncing invoices...",
  "Polishing pixels...",
];

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { brandKit, businessProfile, user, loading, loadingProgress, signOut } = useApp();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Keep favicon in sync with the configured company logo.
  // Keep favicon in sync with the configured company logo.
  useEffect(() => {
    const href = brandKit?.logo_url || "/Logo.jpg.jpeg";  // ← no /public/
    const head = document.head;

    const ensureLink = (rel: string) => {
      let link = head.querySelector<HTMLLinkElement>(`link[rel='${rel}']`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        head.appendChild(link);
      }
      link.href = href;
      // Force browsers that cache aggressively to notice the change
      link.type = href.endsWith(".svg") ? "image/svg+xml" : "image/jpeg";
    };

    ensureLink("icon");
    ensureLink("shortcut icon");
  }, [brandKit?.logo_url]);

  if (loading) {
    const circumference = 2 * Math.PI * 45;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden relative">
        {/* Ambient glow */}
        <div
          className="absolute w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-pulse"
          style={{ animationDuration: "2.4s" }}
        />

        <div className="relative w-36 h-36 flex items-center justify-center" style={{ aspectRatio: "1 / 1" }}>
          {/* Slowly rotating decorative outer ring */}
          <div
            className="absolute inset-0 rounded-full border-2 border-dashed border-primary/25 animate-spin"
            style={{ animationDuration: "6s" }}
          />

          {/* Progress ring */}
          <svg
            className="absolute -rotate-90"
            viewBox="0 0 100 100"
            style={{ width: "128px", height: "128px", aspectRatio: "1 / 1" }}
          >
            <defs>
              <linearGradient id="loaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="1" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-primary/10"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#loaderGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - loadingProgress / 100)}
              style={{
                filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))",
              }}
            />
          </svg>

          {/* Percentage */}
          <span className="relative font-heading font-bold text-3xl text-foreground tabular-nums transition-all duration-300">
            {loadingProgress}
            <span className="text-lg text-muted-foreground">%</span>
          </span>
        </div>

        {/* Cycling status message */}
        <div className="mt-8 h-5 relative overflow-hidden">
          <p
            key={messageIndex}
            className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {LOADING_MESSAGES[messageIndex]}
          </p>
        </div>

        {/* Subtle dot progress indicator */}
        <div className="flex gap-1.5 mt-4">
          {LOADING_MESSAGES.map((_, i) => (
            <span
              key={i}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                i === messageIndex ? "bg-primary" : "bg-primary/20"
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Redirecting to login…</p>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 sidebar-glass text-sidebar-foreground flex flex-col fixed h-full z-50">
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            {businessProfile.logo_url || brandKit?.logo_url ? (
              <img
                src={businessProfile.logo_url || brandKit?.logo_url || "/public/Logo.jpg.jpeg"}
                alt="Logo"
                className="w-10 h-10 object-contain rounded-lg"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
                <span className="text-sidebar-primary-foreground font-heading font-bold text-lg">
                  {(businessProfile.company_name || "Q").trim()[0]?.toUpperCase?.() || "Q"}
                </span>
              </div>
            )}
            <div>
              <h1 className="font-heading font-bold text-sidebar-foreground">{businessProfile.company_name || "QuoteForge"}</h1>
              <p className="text-xs text-sidebar-foreground/60">Operating System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "nav-item",
                  isActive && "nav-item-active"
                )}
              >
                <span className={cn(
                  "transition-colors",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                )}>
                  {item.icon}
                </span>
                <span className={cn(
                  "font-medium transition-colors",
                  isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/70"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto text-sidebar-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Action */}
        <div className="p-4 border-t border-sidebar-border">
          <Link to="/quotations/new">
            <Button className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 font-heading gap-2 rounded-xl">
              <Plus className="w-4 h-4" />
              New Quotation
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link
            to="/settings"
            className="nav-item text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="nav-item text-sidebar-foreground/60 hover:text-sidebar-foreground w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}

      {/* Main Content */}
      <main className="flex-1 ml-64 h-screen overflow-y-auto scrollbar-hide">
        <div className="p-8 max-w-7xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}