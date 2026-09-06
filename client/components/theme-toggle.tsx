"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS = [
    { value: "light", label: "Light", Icon: Sun },
    { value: "dark", label: "Dark", Icon: Moon },
    { value: "system", label: "System", Icon: Monitor },
] as const;

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // The server has no idea which theme the browser will resolve, so rendering the real icon
    // before mount produces a hydration mismatch.
    React.useEffect(() => setMounted(true), []);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button variant="ghost" size="icon" aria-label="Change theme">
                        {mounted && theme === "dark" ? (
                            <Moon />
                        ) : mounted && theme === "light" ? (
                            <Sun />
                        ) : (
                            <Monitor />
                        )}
                    </Button>
                }
            />
            <DropdownMenuContent align="end">
                {OPTIONS.map(({ value, label, Icon }) => (
                    <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
                        <Icon />
                        {label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
