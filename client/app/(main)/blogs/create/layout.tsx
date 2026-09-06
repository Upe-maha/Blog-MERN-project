import { RequireAuth } from "@/components/auth/require-auth";

// No metadata here: create/page.tsx is a server component and sets its own, which wins anyway.
// Only the routes whose page is a client component need their metadata hoisted to a layout.
export default function CreateBlogLayout({ children }: { children: React.ReactNode }) {
    return <RequireAuth>{children}</RequireAuth>;
}
