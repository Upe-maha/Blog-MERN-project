import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import EditProfileForm from "@/components/user/EditProfileForm";
import ChangePassword from "@/components/user/ChangePassword";
import DeleteAccount from "@/components/user/DeleteAccount";

export const metadata: Metadata = {
    title: "Settings",
    // A signed-in-only page has no business in an index.
    robots: { index: false, follow: false },
};

// A server component now. The auth gate is the (main)/profile layout's RequireAuth, so this route
// no longer needs its own redirect effect and spinner — which ran before the store had rehydrated
// and bounced signed-in users to /login on a hard refresh.
export default function SettingsPage() {
    return (
        <div className="max-w-reading py-4">
            <Link
                href="/profile"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-sm text-sm transition-colors"
            >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to profile
            </Link>

            <PageHeader
                title="Settings"
                description="Your name, address and photo, as they appear on everything you publish."
            />

            <EditProfileForm />
            <ChangePassword />
            <DeleteAccount />
        </div>
    );
}
