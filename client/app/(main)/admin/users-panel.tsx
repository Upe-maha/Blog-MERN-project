"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, CircleCheck, ShieldMinus, ShieldPlus, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/types";
import { useAdminStore, useAuthStore } from "@/stores";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/skeletons";
import { revalidateBlogs } from "@/app/actions";
import { Pagination, SearchInput, SortSelect } from "./toolbar";

const PAGE_SIZE = 20;

const SORTS = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "username", label: "Username A–Z" },
    { value: "email", label: "Email A–Z" },
] as const;

function RoleBadge({ role }: { role: string }) {
    return role === "admin" ? <Badge>Admin</Badge> : <Badge variant="outline">User</Badge>;
}

function StatusBadge({ blocked }: { blocked: boolean }) {
    return blocked ? (
        <Badge variant="destructive">Blocked</Badge>
    ) : (
        <Badge variant="secondary">Active</Badge>
    );
}

export function UsersPanel() {
    const { user: me } = useAuthStore();
    const {
        users,
        usersTotal,
        usersPage,
        usersHasMore,
        usersQuery,
        usersSort,
        isLoadingUsers,
        fetchUsers,
        toggleBlockUser,
        setUserRole,
        deleteUser,
    } = useAdminStore();

    const [pendingDelete, setPendingDelete] = useState<User | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        void fetchUsers({ page: 1 });
    }, [fetchUsers]);

    const search = useCallback((q: string) => void fetchUsers({ q, page: 1 }), [fetchUsers]);

    const onBlock = async (u: User) => {
        setBusyId(u._id);
        const error = await toggleBlockUser(u._id);
        setBusyId(null);
        // The server's own message, not a fixed string — "You cannot block the last remaining
        // admin" is the entire reason the guard exists.
        if (error) toast.error(error);
        else toast.success(u.isBlocked ? `${u.username} unblocked` : `${u.username} blocked`);
    };

    const onRole = async (u: User) => {
        const next = u.role === "admin" ? "user" : "admin";
        setBusyId(u._id);
        const error = await setUserRole(u._id, next);
        setBusyId(null);
        if (error) toast.error(error);
        else toast.success(`${u.username} is now ${next === "admin" ? "an admin" : "a user"}`);
    };

    const onDelete = async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        const error = await deleteUser(pendingDelete._id);
        setDeleting(false);
        if (error) {
            toast.error(error);
        } else {
            toast.success(`${pendingDelete.username} deleted`);
            // Deleting a user cascades away every post they wrote, so the archive changed even
            // though nothing on this screen says "post".
            await revalidateBlogs();
            setPendingDelete(null);
        }
    };

    // Mirrors the server's guards so the buttons that would always fail are simply not offered.
    // The API re-checks regardless — this decides what to show, never what is allowed.
    const isSelf = (u: User) => u._id === me?._id;

    const actions = (u: User) => (
        <div className="flex flex-wrap items-center justify-end gap-0.5">
            <Button
                variant="ghost"
                size="xs"
                disabled={isSelf(u) || busyId === u._id}
                onClick={() => onBlock(u)}
                aria-label={u.isBlocked ? `Unblock ${u.username}` : `Block ${u.username}`}
            >
                {u.isBlocked ? <CircleCheck aria-hidden="true" /> : <Ban aria-hidden="true" />}
                {u.isBlocked ? "Unblock" : "Block"}
            </Button>
            <Button
                variant="ghost"
                size="xs"
                disabled={isSelf(u) || busyId === u._id}
                onClick={() => onRole(u)}
                aria-label={
                    u.role === "admin" ? `Demote ${u.username} to user` : `Promote ${u.username} to admin`
                }
            >
                {u.role === "admin" ? (
                    <ShieldMinus aria-hidden="true" />
                ) : (
                    <ShieldPlus aria-hidden="true" />
                )}
                {u.role === "admin" ? "Demote" : "Promote"}
            </Button>
            <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground hover:text-destructive"
                disabled={isSelf(u) || busyId === u._id}
                onClick={() => setPendingDelete(u)}
                aria-label={`Delete ${u.username}`}
            >
                <Trash2 aria-hidden="true" />
                Delete
            </Button>
        </div>
    );

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center gap-2">
                <SearchInput
                    value={usersQuery}
                    onChange={search}
                    label="Search users"
                    placeholder="Name or email…"
                />
                <SortSelect
                    value={usersSort}
                    onChange={(sort) => void fetchUsers({ sort, page: 1 })}
                    options={[...SORTS]}
                    label="Sort users"
                />
            </div>

            {isLoadingUsers ? (
                <TableSkeleton rows={6} />
            ) : users.length === 0 ? (
                <EmptyState
                    icon={UserX}
                    title={usersQuery ? `No users match “${usersQuery}”` : "No users yet"}
                    description={
                        usersQuery ? "Search covers username and email." : "Accounts will appear here."
                    }
                />
            ) : (
                <>
                    {/* Five columns of user data do not fit a 375px screen, and the old table just
                        scrolled sideways. Below md the same rows render as stacked blocks. */}
                    <div className="hidden md:block">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-border text-muted-foreground border-b text-left text-[0.8125rem] tracking-[0.06em]">
                                    <th scope="col" className="py-2 font-normal">Person</th>
                                    <th scope="col" className="py-2 font-normal">Role</th>
                                    <th scope="col" className="py-2 font-normal">Status</th>
                                    <th scope="col" className="py-2 text-right font-normal">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u._id} className="border-border border-b">
                                        <td className="py-3">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar
                                                    username={u.username}
                                                    profilePicture={u.profilePicture}
                                                    className="size-8 shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <div className="truncate">
                                                        {u.username}
                                                        {isSelf(u) ? (
                                                            <span className="text-muted-foreground"> (you)</span>
                                                        ) : null}
                                                    </div>
                                                    <div className="text-muted-foreground truncate text-[0.8125rem]">
                                                        {u.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3"><RoleBadge role={u.role} /></td>
                                        <td className="py-3"><StatusBadge blocked={u.isBlocked} /></td>
                                        <td className="py-3">{actions(u)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-border border-t md:hidden">
                        {users.map((u) => (
                            <div key={u._id} className="border-border border-b py-4">
                                <div className="flex items-center gap-3">
                                    <UserAvatar
                                        username={u.username}
                                        profilePicture={u.profilePicture}
                                        className="size-9 shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate">
                                            {u.username}
                                            {isSelf(u) ? (
                                                <span className="text-muted-foreground"> (you)</span>
                                            ) : null}
                                        </div>
                                        <div className="text-muted-foreground truncate text-[0.8125rem]">
                                            {u.email}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <RoleBadge role={u.role} />
                                    <StatusBadge blocked={u.isBlocked} />
                                </div>
                                <div className="mt-3">{actions(u)}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <Pagination
                page={usersPage}
                total={usersTotal}
                limit={PAGE_SIZE}
                hasMore={usersHasMore}
                loading={isLoadingUsers}
                onPage={(p) => void fetchUsers({ page: p })}
            />

            <ConfirmDialog
                open={!!pendingDelete}
                onOpenChange={(open) => {
                    if (!open) setPendingDelete(null);
                }}
                title={pendingDelete ? `Delete ${pendingDelete.username}?` : "Delete user?"}
                description="Their account, every post they wrote, and all the comments and likes attached to them are removed. This cannot be undone."
                confirmLabel="Delete account"
                destructive
                loading={deleting}
                onConfirm={onDelete}
            />
        </div>
    );
}

export default UsersPanel;
