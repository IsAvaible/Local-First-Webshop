import { useState, useRef, type FocusEvent, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from "@/components/ui/command.tsx";
import { Command as CommandPrimitive } from "cmdk";
import {
  Loader2Icon,
  SearchIcon,
  SettingsIcon,
  ShoppingCartIcon,
  UserIcon
} from "lucide-react";
import * as React from "react";
import { Link, useLocation, useSearch } from "@tanstack/react-router";
import type { Asset } from "@/db/schema.ts";
import { AssetImage } from "@/components/ui/assetImage.tsx";
import { Route } from "@/routes/search.tsx";
import { useSearchSuggestionsQuery } from "@/hooks/queries/useSearchQueries.ts";

// Static Navigation Items
const NAV_ITEMS = [
  { label: "Profile", icon: UserIcon, to: "/profile", shortcut: "⌘P" },
  { label: "Cart", icon: ShoppingCartIcon, to: "/cart", shortcut: "⌘C" },
  {
    label: "Settings",
    icon: SettingsIcon,
    to: "/profile?tab=settings",
    shortcut: "⌘S"
  }
];

export function SearchBar() {
  const navigate = Route.useNavigate();
  const location = useLocation();

  const searchParams = useSearch({ strict: false });
  const searchTerm = searchParams.q;

  // Helper to determine if we should inherit params or start fresh
  const isSearchPage = location.pathname === "/search";

  const activeSearchTerm = isSearchPage ? (searchTerm ?? "") : "";

  // --- State and Refs ---
  const [search, setSearch] = useState<string>(activeSearchTerm);
  const [open, setOpen] = useState<boolean>(false);

  // Clear search when navigating away from /search
  useEffect(() => {
    if (!isSearchPage) {
      setSearch("");
    }
  }, [location.pathname, isSearchPage]);

  const inputRef = useRef<HTMLInputElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);

  // --- Centralized search logic ---
  const trimmedSearch = search.trim();
  const minSearchLength = 2;
  const isSearchActive = trimmedSearch.length >= minSearchLength;

  // Filter navigation items
  const matchingNavItems = useMemo(() => {
    if (!isSearchActive) return [];
    return NAV_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(trimmedSearch.toLowerCase())
    );
  }, [isSearchActive, trimmedSearch]);

  // --- Live suggestions ---
  const { data, isLoading: isSearching } = useSearchSuggestionsQuery(
    trimmedSearch,
    isSearchActive
  );

  const suggestions = data?.suggestions;
  const matchingCategories = data?.matchingCategories;
  const matchingCompanies = data?.matchingCompanies;

  const clearSearch = () => {
    setSearch("");
    inputRef.current?.focus();
  };

  // Close the command list when clicking outside the component
  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (
        commandRef.current &&
        !commandRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const submitSearch = (rawSearch = false) => {
    // Prepare cleanup/UI state updates
    const handleCleanup = () => {
      setOpen(false);
      inputRef.current?.blur();
    };

    // Define state checks for readability
    const hasSuggestions = (suggestions?.length ?? 0) > 0;
    const hasCategories = (matchingCategories?.length ?? 0) > 0;
    const hasCompanies = (matchingCompanies?.length ?? 0) > 0;
    const hasSingleNavMatch = (matchingNavItems?.length ?? 0) === 1;
    const isSingleProduct = (suggestions?.length ?? 0) === 1;

    // Handle "Smart" Navigation (Priority Order)
    if (!rawSearch) {
      // Case A: No products, but matching Categories -> Filter Search by Category
      if (!hasSuggestions && hasCategories) {
        const categoryIds = matchingCategories!.map((c) => c.id);
        void navigate({
          to: "/search",
          search: (prev) => ({
            ...(isSearchPage ? prev : {}),
            q: undefined, // Clear text query when selecting specific filters
            categories: categoryIds,
            companies: []
          })
        });
        return handleCleanup();
      }

      // Case B: No products, but matching Companies -> Filter Search by Company
      if (!hasSuggestions && hasCompanies) {
        const companyIds = matchingCompanies!.map((c) => c.id);
        void navigate({
          to: "/search",
          search: (prev) => ({
            ...(isSearchPage ? prev : {}),
            q: undefined,
            companies: companyIds,
            categories: []
          })
        });
        return handleCleanup();
      }

      // Case C: No products, exact Nav Item match -> Direct Navigation
      if (!hasSuggestions && hasSingleNavMatch) {
        const item = matchingNavItems[0];
        if (item.to) {
          void navigate({ to: item.to });
          return handleCleanup();
        }
      }

      // Case D: Exact single Product match -> Product Details Page
      if (isSingleProduct) {
        void navigate({
          to: "/products/$productId",
          params: { productId: suggestions![0].id }
        });
        return handleCleanup();
      }
    }

    // 4. Default Fallback (Generic Text Search)
    void navigate({
      to: "/search",
      search: (prev) => ({
        ...(isSearchPage ? prev : {}),
        q: search,
        categories: [],
        companies: []
      })
    });

    handleCleanup();
  };

  const handleFocus = () => {
    setOpen(true);
    const input = inputRef.current;
    if (input?.hasAttribute("data-rtl")) {
      input.blur();
      input.removeAttribute("data-rtl");
      input.focus();
    }
  };

  const handleBlur = (event: FocusEvent) => {
    const command = commandRef.current;
    const input = inputRef.current;
    if (
      command &&
      !command.contains(event.relatedTarget) &&
      input &&
      !input.hasAttribute("data-rtl")
    ) {
      const delay = 300 - (search.length / 10) * 150;
      setTimeout(() => {
        input.setAttribute("data-rtl", "");
      }, delay);
    }
    if (!command?.contains(event.relatedTarget)) {
      setOpen(false);
    }
  };

  return (
    <Command
      unstyled={true}
      shouldFilter={false}
      ref={commandRef}
      className={cn(
        "group relative -mr-4 flex max-w-full flex-row items-center gap-x-2 rounded-full py-1 ring-1 ring-transparent duration-500",
        "max-sm:mr-0 max-sm:px-4 max-sm:ring-slate-800", // Mobile styles
        "hover:mr-0 hover:px-4 hover:ring-slate-800", // Hover styles
        "focus-within:mr-0 focus-within:px-4 focus-within:ring-slate-800", // Focus-within styles
        "has-[input:not(:placeholder-shown)]:mr-0 has-[input:not(:placeholder-shown)]:px-4 has-[input:not(:placeholder-shown)]:ring-slate-800" // Has content styles
      )}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <button
        type="submit"
        aria-label="Search"
        className="cursor-pointer transition-transform hover:scale-110"
        onClick={() => submitSearch()}
      >
        <SearchIcon className="h-6 w-6" />
      </button>

      <CommandPrimitive.Input
        ref={inputRef}
        name="search"
        placeholder="Search"
        autoComplete="off"
        pattern=".{0,12}"
        value={open ? search : activeSearchTerm}
        onValueChange={(value) => setSearch(value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const rawSearch = e.shiftKey;
            submitSearch(rawSearch);
          }
        }}
        className={cn(
          "peer flex w-40 bg-[inherit] text-[inherit] focus:outline-none", // Base & Styling
          "transition-[width] duration-[inherit]", // Transitions
          "group-focus-within:w-40! group-hover:placeholder-shown:w-40! sm:w-0", // Small screens: Hidden by default, expands when group is focused/hovered
          "[&:not(:placeholder-shown)]:w-[10ch] [&:not(:placeholder-shown)]:truncate", // State when typing: Expands and truncates overflow
          "[&[data-rtl]:not(:valid)]:[direction:rtl]" // Truncate from front if text exceeds 12 characters
        )}
      />
      <button
        aria-label="Clear Search"
        type="button"
        className={cn(
          "aspect-square cursor-pointer overflow-hidden p-0.5 opacity-100", // Base & Styling
          "transition-[opacity,width] duration-300", // Transitions
          "w-0 group-focus-within:w-6 group-hover:w-6", // Interaction: Hidden by default, expands on group focus/hover
          "peer-placeholder-shown:opacity-0", // Conditional Visibility: Hidden when peer input is empty
          "not-peer-placeholder-shown:w-6" // Conditional Visibility: Expands when peer input has text
        )}
        tabIndex={search.length ? 0 : -1}
        onClick={clearSearch}
      >
        {isSearching ? (
          <Loader2Icon className="h-5 w-5 animate-spin" />
        ) : (
          <XCircleIcon className="h-5 w-5" />
        )}
      </button>
      {open && (
        <CommandList className="absolute top-11 left-0 z-10 w-full rounded-md border bg-white text-slate-900 shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
          <CommandEmpty>No results found.</CommandEmpty>

          {/* When search is active (2+ chars), show suggestions */}
          {isSearchActive ? (
            <>
              {(suggestions?.length ?? 0) > 0 && (
                <CommandGroup heading="Suggestions">
                  {suggestions?.map((p) => (
                    <Link
                      to={"/products/$productId"}
                      params={{ productId: p.id }}
                      key={p.id}
                    >
                      <CommandItem
                        key={p.id}
                        onSelect={() => {
                          setOpen(false);
                        }}
                      >
                        <ProductCommandItem
                          asset={p.asset}
                          name={p.name}
                          price={p.base_price ? `${p.base_price} €` : "-"}
                        />
                      </CommandItem>
                    </Link>
                  ))}
                </CommandGroup>
              )}

              {/* Show matching categories as separate items */}
              {(matchingCategories?.length ?? 0) > 0 && (
                <CommandGroup heading="Categories">
                  {matchingCategories?.map((c) => (
                    <CommandItem
                      key={`cat-${c.id}`}
                      onSelect={() => {
                        // navigate directly to search with this single category
                        void navigate({
                          to: "/search",
                          search: (prev) => ({
                            ...(isSearchPage ? prev : {}),
                            q: undefined,
                            categories: [c.id],
                            companies: []
                          })
                        });
                        setOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-sm text-slate-500">Category</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Show matching companies as separate items */}
              {(matchingCompanies?.length ?? 0) > 0 && (
                <CommandGroup heading="Companies">
                  {matchingCompanies?.map((co) => (
                    <CommandItem
                      key={`co-${co.id}`}
                      onSelect={() => {
                        // navigate directly to search with this single company
                        void navigate({
                          to: "/search",
                          search: (prev) => ({
                            ...(isSearchPage ? prev : {}),
                            q: undefined,
                            companies: [co.id],
                            categories: []
                          })
                        });
                        setOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{co.name}</span>
                        <span className="text-sm text-slate-500">Company</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {matchingNavItems.length > 0 && (
                <CommandGroup heading="Navigation">
                  {matchingNavItems.map((item) => {
                    const content = (
                      <CommandItem
                        key={item.label}
                        onSelect={() => setOpen(false)}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                        <CommandShortcut>{item.shortcut}</CommandShortcut>
                      </CommandItem>
                    );

                    return item.to ? (
                      <Link key={item.label} to={item.to}>
                        {content}
                      </Link>
                    ) : (
                      <div key={item.label}>{content}</div>
                    );
                  })}
                </CommandGroup>
              )}
            </>
          ) : (
            <>
              {/* Default content when search is not active */}
              {/* TODO: Show some popular products or recent searches */}
              {/*<CommandGroup heading="Suggestions">*/}
              {/*</CommandGroup>*/}
              <CommandSeparator />
              <CommandGroup heading="Navigation">
                <Link to={"/profile"}>
                  <CommandItem onSelect={() => setOpen(false)}>
                    <UserIcon />
                    <span>Profile</span>
                    <CommandShortcut>⌘P</CommandShortcut>
                  </CommandItem>
                </Link>
                <Link to={"/cart"}>
                  <CommandItem onSelect={() => setOpen(false)}>
                    <ShoppingCartIcon />
                    <span>Cart</span>
                    <CommandShortcut>⌘B</CommandShortcut>
                  </CommandItem>
                </Link>
                <CommandItem>
                  <SettingsIcon />
                  <span>Settings</span>
                  <CommandShortcut>⌘S</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      )}
    </Command>
  );
}

const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    color="currentColor"
    strokeWidth="1.5"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM9.70164 8.64124C9.40875 8.34835 8.93388 8.34835 8.64098 8.64124C8.34809 8.93414 8.34809 9.40901 8.64098 9.7019L10.9391 12L8.64098 14.2981C8.34809 14.591 8.34809 15.0659 8.64098 15.3588C8.93388 15.6517 9.40875 15.6517 9.70164 15.3588L11.9997 13.0607L14.2978 15.3588C14.5907 15.6517 15.0656 15.6517 15.3585 15.3588C15.6514 15.0659 15.6514 14.591 15.3585 14.2981L13.0604 12L15.3585 9.7019C15.6514 9.40901 15.6514 8.93414 15.3585 8.64124C15.0656 8.34835 14.5907 8.34835 14.2978 8.64124L11.9997 10.9393L9.70164 8.64124Z"
      fill="currentColor"
    ></path>
  </svg>
);

interface ProductCommandItemProps {
  asset?: Asset;
  name: string;
  price: string;
}
const ProductCommandItem = ({
  asset,
  name,
  price,
  ...props
}: ProductCommandItemProps & React.ComponentProps<typeof CommandItem>) => {
  return (
    <CommandItem {...props}>
      <AssetImage
        asset={asset}
        containerClassName="aspect-3/4 w-6 rounded-sm"
      />
      <div className="flex flex-col">
        <span className="font-medium">{name}</span>
        <span className="text-sm text-slate-500">{price}</span>
      </div>
    </CommandItem>
  );
};
