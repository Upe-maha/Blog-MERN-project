"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SearchForm } from "./SearchForm";

// Search used to live inside the burger menu, which put the site's main way of finding anything
// three interactions deep — open the menu, find the field, type — and grouped a text input in with
// a list of destinations. It is a distinct task and now has its own control in the nav, at the one
// width where the inline field does not fit.
//
// A top sheet rather than a dropdown: it brings the field to the thumb, and the primitive supplies
// the focus trap, the Escape handler and the scroll lock that a hand-rolled panel would not.
const MobileSearch = () => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                // Not "Search essays": that is the inline field's own label, and both are in the
                // DOM at once (one hidden per breakpoint). Two controls sharing an accessible name
                // is ambiguous to anything reading the tree rather than the layout.
                aria-label="Open search"
                onClick={() => setOpen(true)}
            >
                <Search />
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="top" className="pb-5">
                    <SheetHeader>
                        <SheetTitle>Search</SheetTitle>
                    </SheetHeader>
                    <div className="px-4">
                        {/* onNavigate closes the sheet: picking a suggestion navigates, and a
                            sheet left open over the destination is the classic mobile bug. */}
                        <SearchForm autoFocus onNavigate={() => setOpen(false)} />
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
};

export default MobileSearch;
