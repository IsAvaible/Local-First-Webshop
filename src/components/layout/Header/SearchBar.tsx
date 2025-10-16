import { useState, useRef, type FocusEvent } from "react";
import { cn } from "@/lib/utils";

// --- Props Definition ---
interface SearchBarProps {
  search?: string | null;
}

// --- Main Component ---
export function SearchBar({ search: initialSearch }: SearchBarProps) {
  // --- State and Refs ---
  const [search, setSearch] = useState<string>(() => {
    // Initialize search state from props or URL search params on first render
    if (initialSearch) return initialSearch;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("search") ?? "";
    }
    return "";
  });
  const [searching] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const clearSearch = () => {
    setSearch("");
    inputRef.current?.focus();
  };

  // The following handlers replicate the complex focus/blur behavior
  // which resets cursor position for right-to-left text.
  const handleFormFocus = () => {
    const input = inputRef.current;
    if (input?.hasAttribute("data-rtl")) {
      input.blur();
      input.removeAttribute("data-rtl");
      input.focus();
    }
  };

  const handleFormBlur = (event: FocusEvent<HTMLFormElement>) => {
    const form = formRef.current;
    const input = inputRef.current;
    // Check if focus is leaving the form entirely
    if (
      form &&
      !form.contains(event.relatedTarget) &&
      input &&
      !input.hasAttribute("data-rtl")
    ) {
      const delay = 300 - (search.length / 10) * 150;
      setTimeout(() => {
        input.setAttribute("data-rtl", "");
      }, delay);
    }
  };

  // --- JSX ---
  return (
    <form
      ref={formRef}
      action={"#"}
      noValidate
      className={cn(
        "group relative -mr-4 flex max-w-full flex-row items-center gap-x-2 rounded-full py-1 ring-1 ring-transparent duration-500",
        "max-sm:mr-0 max-sm:px-4 max-sm:ring-slate-800", // Mobile styles
        "hover:mr-0 hover:px-4 hover:ring-slate-800", // Hover styles
        "focus-within:mr-0 focus-within:px-4 focus-within:ring-slate-800", // Focus-within styles
        "has-[input:not(:placeholder-shown)]:mr-0 has-[input:not(:placeholder-shown)]:px-4 has-[input:not(:placeholder-shown)]:ring-slate-800" // Has content styles
      )}
      onFocus={handleFormFocus}
      onBlur={handleFormBlur}
    >
      <button
        type="submit"
        aria-label="Search"
        className="cursor-pointer transition-transform hover:scale-110"
      >
        <SearchIcon className="h-6 w-6" />
      </button>

      <input
        ref={inputRef}
        type="text"
        name="search"
        placeholder="Search"
        autoComplete="off"
        pattern=".{0,12}"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
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
          <SpinnerIcon className="h-5 w-5" />
        ) : (
          <XCircleIcon className="h-5 w-5" />
        )}
      </button>
    </form>
  );
}

// --- Icon Components ---
// It's best practice to define SVG icons as their own components.

const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24px"
    height="24px"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    color="currentColor"
    {...props}
  >
    <path
      d="M17 17L21 21"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></path>
    <path
      d="M3 11C3 15.4183 6.58172 19 11 19C13.213 19 15.2161 18.1015 16.6644 16.6493C18.1077 15.2022 19 13.2053 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></path>
  </svg>
);

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

const SpinnerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    className="animate-spin fill-slate-800 text-gray-200 dark:text-gray-600"
    viewBox="0 0 100 101"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
      fill="currentColor"
    ></path>
    <path
      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
      fill="currentFill"
    ></path>
  </svg>
);
