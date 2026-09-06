"use client";

import Link from "next/link";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Replaces an `opacity-0 group-hover:opacity-100` delete button that was invisible on touch
// devices and unreachable by keyboard — while still being focusable, so tabbing landed on a
// control nobody could see.
//
// The trigger is always rendered. The menu handles focus, Escape and arrow keys itself.
export function PostActionsMenu({
    blogId,
    title,
    onDelete,
}: {
    blogId: string;
    title: string;
    onDelete: () => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground"
                        // The label names the post: a page of these would otherwise announce
                        // "more actions" a dozen times with nothing to tell them apart.
                        aria-label={`Actions for “${title}”`}
                    >
                        <MoreVertical aria-hidden="true" />
                    </Button>
                }
            />
            <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href={`/blogs/${blogId}/edit`} />}>
                    <Pencil aria-hidden="true" />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                    <Trash2 aria-hidden="true" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default PostActionsMenu;
