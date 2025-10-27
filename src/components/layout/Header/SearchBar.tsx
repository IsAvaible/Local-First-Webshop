import { useState, useRef, type FocusEvent, useEffect } from "react";
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
  CreditCard,
  Loader2Icon,
  SearchIcon,
  SettingsIcon,
  UserIcon
} from "lucide-react";
import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery, Query, or, ilike, min, eq } from "@tanstack/react-db";
import {
  productsCollection,
  pricingTiersCollection,
  assetsCollection,
  categoriesCollection
} from "@/lib/collections.ts";

// --- Main Component ---
export function SearchBar() {
  const navigate = useNavigate();

  // --- State and Refs ---
  const [search, setSearch] = useState<string>(() => {
    return new URLSearchParams(window.location.search).get("q") ?? "";
  });
  const [searching] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);

  // --- Live suggestions ---
  const { data: suggestions, isEnabled } = useLiveQuery(() => {
    let query = new Query().from({ p: productsCollection });
    const term = (search ?? "").trim();

    // There is some issue with this
    // if (term.length < 3) {
    //   return undefined;
    // }

    const words = term.split(" ").filter(Boolean);
    for (const w of words) {
      query = query.where(({ p }) =>
        or(ilike(p.name, `%${w}%`), ilike(p.description, `%${w}%`))
      );
    }

    // Join min price subquery
    const minPriceSubquery = new Query()
      .from({ pt: pricingTiersCollection })
      .groupBy(({ pt }) => pt.product_id)
      .select(({ pt }) => ({
        product_id: pt.product_id,
        min_price: min(pt.price_per_unit)
      }));

    const queryWithPrice = query.leftJoin(
      { price: minPriceSubquery },
      ({ p, price }) => eq(p.id, price.product_id)
    );

    // Join first asset
    const firstAssetIdSubquery = new Query()
      .from({ a: assetsCollection })
      .groupBy(({ a }) => a.product_id)
      .select(({ a }) => ({
        product_id: a.product_id,
        first_asset_id: min(a.id)
      }));

    return queryWithPrice
      .leftJoin({ fa_id: firstAssetIdSubquery }, ({ p, fa_id }) =>
        eq(p.id, fa_id.product_id)
      )
      .leftJoin({ asset: assetsCollection }, ({ asset, fa_id }) =>
        eq(asset.id, fa_id?.first_asset_id)
      )
      .orderBy(({ price }) => price?.min_price, {
        direction: "asc",
        nulls: "last"
      })
      .select(({ p, price, asset }) => ({
        ...p,
        min_price: price?.min_price,
        asset
      }));
  }, [search]);

  // --- Live matching categories ---
  const { data: matchingCategories } = useLiveQuery(() => {
    const term = (search ?? "").trim();
    if (!term) return undefined;

    let q = new Query().from({ c: categoriesCollection });
    const words = term.split(" ").filter(Boolean);
    for (const w of words) {
      q = q.where(({ c }) =>
        or(ilike(c.name, `%${w}%`), ilike(c.description, `%${w}%`))
      );
    }
    return q.select(({ c }) => ({ ...c }));
  }, [search]);

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

  const submitSearch = () => {
    if (suggestions.length == 0 && matchingCategories?.length) {
      // if there are no product suggestions but there are matching categories,
      // navigate to search with those categories selected
      const categoryIds = matchingCategories?.map((c) => c.id) ?? [];
      void navigate({
        to: "/search",
        search: (prev) => ({
          ...prev,
          q: undefined,
          categories: categoryIds
        })
      });
      setSearch("");
    } else {
      // else navigate to search with the current search term
      void navigate({
        to: "/search",
        search: (prev) => ({
          ...prev,
          q: search,
          categories: []
        })
      });
    }

    setOpen(false);
    inputRef.current?.blur();
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

  // --- JSX ---
  return (
    <Command
      unstyled
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
        onClick={submitSearch}
      >
        <SearchIcon className="h-6 w-6" />
      </button>

      <CommandPrimitive.Input
        ref={inputRef}
        name="search"
        placeholder="Search"
        autoComplete="off"
        pattern=".{0,12}"
        value={search}
        onValueChange={(value) => setSearch(value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submitSearch();
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
        {searching ? (
          <Loader2Icon className="h-5 w-5 animate-spin" />
        ) : (
          <XCircleIcon className="h-5 w-5" />
        )}
      </button>
      {open && (
        <CommandList className="absolute top-11 left-0 z-10 w-full rounded-md border bg-white text-slate-900 shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
          <CommandEmpty>No results found.</CommandEmpty>
          {/* When there is a search term, show suggestions, else show default empty/settings */}
          {isEnabled ? (
            <>
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
                        imgUrl={p.asset?.url ?? "/src/assets/react.svg"}
                        name={p.name}
                        price={
                          p.min_price != null
                            ? `${p.min_price as number} €`
                            : "-"
                        }
                      />
                    </CommandItem>
                  </Link>
                ))}

                {/* Show matching categories as separate items */}
                {matchingCategories?.map((c) => (
                  <CommandItem
                    key={`cat-${c.id}`}
                    onSelect={() => {
                      // navigate directly to search with this single category
                      void navigate({
                        to: "/search",
                        search: (prev) => ({
                          ...prev,
                          q: undefined,
                          categories: [c.id]
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
            </>
          ) : (
            <>
              <CommandGroup heading="Suggestions">
                <ProductCommandItem
                  imgUrl={"/src/assets/react.svg"}
                  name={"Test Product"}
                  price={"14.99 €"}
                />
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Settings">
                <CommandItem>
                  <UserIcon />
                  <span>Profile</span>
                  <CommandShortcut>⌘P</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <CreditCard />
                  <span>Billing</span>
                  <CommandShortcut>⌘B</CommandShortcut>
                </CommandItem>
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

// --- Icon Components ---

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
  imgUrl: string;
  name: string;
  price: string;
}
const ProductCommandItem = ({
  imgUrl,
  name,
  price,
  ...props
}: ProductCommandItemProps & React.ComponentProps<typeof CommandItem>) => {
  return (
    <CommandItem {...props}>
      <img
        className="aspect-square h-6 w-6 rounded-md"
        src={imgUrl}
        alt={name}
      />
      <div className="flex flex-col">
        <span className="font-medium">{name}</span>
        <span className="text-sm text-slate-500">{price}</span>
      </div>
    </CommandItem>
  );
};
