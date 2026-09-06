"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/stores";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/errorHandler";
import { revalidateBlogs } from "@/app/actions";

// Not ConfirmDialog: this one needs the account name typed before the button arms. A single
// destructive click is the right weight for one post, not for everything the account has written.
export function DeleteAccount() {
    const router = useRouter();
    const { user, logout } = useAuthStore();

    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState("");
    const [deleting, setDeleting] = useState(false);

    if (!user) return null;

    const armed = typed.trim() === user.username;

    const remove = async () => {
        if (!armed) return;
        setDeleting(true);
        try {
            // DELETE /users/me — the transactional cascade: the account, its posts, and every
            // comment and like on or by it, plus the stored images.
            await authService.deleteMe();
            // logout() also clears the session-hint cookie, so proxy.ts stops treating the visitor
            // as signed in on the very next navigation.
            logout();
            toast.success("Your account has been deleted");
            // The cascade took every post this account wrote with it. Without dropping the list
            // tag the archive keeps serving those rows — to everyone, not just this browser —
            // until the 60s window happens to expire.
            await revalidateBlogs();
            router.push("/");
            router.refresh();
        } catch (err) {
            toast.error(getErrorMessage(err, "Could not delete your account."));
            setDeleting(false);
        }
    };

    return (
        <section className="border-destructive/30 mt-12 border-t pt-8">
            <h2 className="text-destructive text-base font-medium">Delete account</h2>
            <p className="text-muted-foreground mt-2 max-w-prose text-sm">
                Permanently removes your account, every post you have written, and all of the
                comments and likes attached to them. This cannot be undone.
            </p>

            <Button
                variant="destructive"
                size="sm"
                className="mt-4"
                onClick={() => {
                    setTyped("");
                    setOpen(true);
                }}
            >
                Delete my account
            </Button>

            <AlertDialog
                open={open}
                onOpenChange={(next) => {
                    if (!deleting) setOpen(next);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Everything you have written here is removed along with it. There is no
                            undo and no export.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <Field>
                        <FieldLabel htmlFor="confirm-username">
                            Type <span className="text-foreground font-semibold">{user.username}</span>{" "}
                            to confirm
                        </FieldLabel>
                        <Input
                            id="confirm-username"
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            autoComplete="off"
                            // The browser would otherwise offer to fill this with the username it
                            // has saved, which defeats the point of asking for it.
                            data-1p-ignore
                            disabled={deleting}
                        />
                        <FieldDescription>
                            The button stays disabled until it matches exactly.
                        </FieldDescription>
                    </Field>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Keep my account</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={!armed || deleting}
                            onClick={(e) => {
                                // The primitive closes the dialog on action click; the request has
                                // not finished yet, so hold it open until the redirect happens.
                                e.preventDefault();
                                void remove();
                            }}
                        >
                            {deleting ? <Loader2 className="animate-spin" /> : null}
                            {deleting ? "Deleting…" : "Delete everything"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}

export default DeleteAccount;
