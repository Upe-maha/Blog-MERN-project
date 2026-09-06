"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Heart, MessageSquare, ShieldBan, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAdminStore } from "@/stores";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsersPanel from "./users-panel";
import BlogsPanel from "./blogs-panel";

// The (main)/admin layout wraps this in RequireAuth requireAdmin, so the route no longer carries
// its own hydration check, role check, redirect effect and spinner.

const TABS = ["users", "posts"] as const;
type Tab = (typeof TABS)[number];

function Stat({
    icon: Icon,
    value,
    label,
    hint,
    loading,
}: {
    icon: LucideIcon;
    value: number;
    label: string;
    hint?: string;
    loading: boolean;
}) {
    return (
        <div className="border-border border-l pl-4">
            <div className="text-muted-foreground flex items-center gap-1.5 text-[0.8125rem] tracking-[0.06em]">
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
            </div>
            {loading ? (
                <Skeleton className="mt-2 h-7 w-14" />
            ) : (
                <div className="font-serif mt-1.5 text-2xl leading-none tabular-nums">{value}</div>
            )}
            {hint ? <div className="text-muted-foreground mt-1.5 text-xs">{hint}</div> : null}
        </div>
    );
}

export default function AdminDashboard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { stats, isLoadingStats, fetchStats, error, clearError } = useAdminStore();

    const param = searchParams.get("tab");
    const tab: Tab = TABS.includes(param as Tab) ? (param as Tab) : "users";

    useEffect(() => {
        void fetchStats();
    }, [fetchStats]);

    // The active tab lives in the URL, so a refresh, a bookmark or a shared link all land back on
    // the same one. replace, not push: paging through tabs should not fill the back button.
    const onTabChange = (next: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", next);
        router.replace(`/admin?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="py-4">
            <PageHeader title="Admin" description="Everyone and everything published here." />

            {error ? (
                <div
                    role="alert"
                    className="border-destructive text-destructive mb-6 flex items-start justify-between gap-4 border-l-2 py-1 pl-3 text-sm"
                >
                    <span>{error}</span>
                    <button
                        onClick={clearError}
                        className="text-muted-foreground hover:text-foreground shrink-0 rounded-sm text-xs"
                    >
                        Dismiss
                    </button>
                </div>
            ) : null}

            <div className="mb-10 grid grid-cols-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
                <Stat
                    icon={Users}
                    value={stats?.users ?? 0}
                    label="People"
                    hint={stats ? `${stats.newUsers7d} joined this week` : undefined}
                    loading={isLoadingStats && !stats}
                />
                <Stat
                    icon={ShieldBan}
                    value={stats?.blocked ?? 0}
                    label="Blocked"
                    hint={stats ? `${stats.admins} admin${stats.admins === 1 ? "" : "s"}` : undefined}
                    loading={isLoadingStats && !stats}
                />
                <Stat
                    icon={FileText}
                    value={stats?.blogs ?? 0}
                    label="Posts"
                    loading={isLoadingStats && !stats}
                />
                <Stat
                    icon={MessageSquare}
                    value={stats?.comments ?? 0}
                    label="Comments"
                    loading={isLoadingStats && !stats}
                />
                <Stat
                    icon={Heart}
                    value={stats?.likes ?? 0}
                    label="Likes"
                    loading={isLoadingStats && !stats}
                />
            </div>

            {/* The primitive supplies role="tablist"/"tab"/"tabpanel", aria-selected, aria-controls
                and arrow-key navigation. The hand-rolled buttons this replaces had none of them. */}
            <Tabs value={tab} onValueChange={onTabChange}>
                <TabsList variant="line" className="mb-6">
                    <TabsTrigger value="users">
                        Users
                        {stats ? (
                            <span className="text-muted-foreground tabular-nums"> {stats.users}</span>
                        ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="posts">
                        Posts
                        {stats ? (
                            <span className="text-muted-foreground tabular-nums"> {stats.blogs}</span>
                        ) : null}
                    </TabsTrigger>
                </TabsList>

                {/* The counts above come from /admin/stats, so they are the totals across the whole
                    collection — the old labels used users.length, which meant "rows on this page". */}
                <TabsContent value="users">
                    <UsersPanel />
                </TabsContent>
                <TabsContent value="posts">
                    <BlogsPanel />
                </TabsContent>
            </Tabs>
        </div>
    );
}
