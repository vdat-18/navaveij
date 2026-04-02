"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    LineChart,
    ShieldCheck,
    HelpCircle,
    Activity
} from "lucide-react";
import { cn } from "@/shared/utils";
import { useAuth } from "@/shared/auth-context";

const menuItems = [
    { icon: LayoutDashboard, label: "Clinical Dashboard", id: "dashboard",  href: "/" },
    { icon: LineChart,       label: "Trend & Timeline",   id: "timeline",   href: "/trend-timeline" },
    // /audit remains available as an alias route and redirects to /access-monitoring.
    { icon: ShieldCheck,     label: "Access Monitoring & Audit Log", id: "monitoring", href: "/access-monitoring" },
    { icon: Activity,        label: "Management Metrics", id: "management", href: "/management" },
];

/** Roles that use the single-entry-point flow (no sidebar). */
const SIDEBAR_HIDDEN_ROLES = new Set(["physician", "nurse"]);

export function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    // Physicians and nurses use the new single-entry-point search flow — no sidebar needed.
    // The /report page is standalone and also renders without sidebar for all roles.
    if (pathname === '/report' || (user && SIDEBAR_HIDDEN_ROLES.has(user.role))) {
        return null;
    }

    // While auth is loading (user === null on login page), also hide sidebar.
    if (!user) {
        return null;
    }

    return (
        <aside aria-label="Main navigation" className="w-[var(--sidebar-width)] glass-sidebar h-screen flex flex-col p-6 fixed left-0 top-0 z-50">
            <div className="flex flex-col mb-12">
                <Image
                    src="/logo-navavej.png"
                    alt="Navavej"
                    width={120}
                    height={48}
                    className="h-12 w-auto object-contain mb-2 self-start"
                />
                <div className="flex items-center gap-2 px-1">
                    <div className="h-4 w-[2px] bg-teal-accent/40" />
                    <h1 className="text-xs font-black tracking-[0.3em] uppercase opacity-70">
                        Clinical <span className="text-teal-accent">Intelligence</span>
                    </h1>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-4 px-2">
                    Management
                </p>
                {menuItems.map((item) => (
                    <Link
                        key={item.id}
                        href={item.href}
                        aria-current={pathname === item.href ? "page" : undefined}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                            pathname === item.href
                                ? "bg-teal-accent/10 text-teal-accent"
                                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                        )}
                    >
                        <item.icon className={cn("w-5 h-5", pathname === item.href ? "text-teal-accent" : "text-slate-500 group-hover:text-slate-300")} />
                        <span className="font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="mt-auto space-y-2">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all">
                    <HelpCircle className="w-5 h-5 text-slate-500" />
                    <span className="font-medium">Support</span>
                </button>
            </div>
        </aside>
    );
}
