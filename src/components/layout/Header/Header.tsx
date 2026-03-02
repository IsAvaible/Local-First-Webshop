import { useState, useEffect } from "react";
import {
  HomeIcon,
  HeartIcon,
  UserIcon,
  MenuIcon,
  PackageOpenIcon
} from "lucide-react";
import { SearchBar } from "@/components/layout/Header/SearchBar.tsx";
import { CartHeaderButton } from "@/components/cart/CartHeaderButton.tsx";
import { NotificationPanel } from "@/components/notifications/NotificationPanel.tsx";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const focusClasses =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 dark:focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-gray-900 rounded-full";

  return (
    <header
      className={`sticky top-0 z-10 w-full bg-gray-50 p-6 transition-shadow duration-300 dark:bg-gray-900 ${
        isScrolled ? "shadow-md" : ""
      }`}
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center sm:grid-cols-3"
      >
        <div>
          <Link
            to={"/"}
            aria-label="Partslist Home"
            className={cn(
              focusClasses,
              `flex flex-row items-center gap-x-2 text-2xl font-bold text-slate-800 dark:text-slate-100`
            )}
          >
            <PackageOpenIcon className="h-8 w-8" aria-hidden="true" />
            <span className="max-sm:hidden">Partslist</span>
          </Link>
        </div>

        <div className="flex flex-row items-center justify-center gap-x-6 max-sm:[&>*:not(:nth-child(2))]:hidden">
          <Link
            to={"/"}
            className={cn(
              focusClasses,
              `flex flex-row items-center gap-x-1 rounded-full bg-slate-900 px-4 py-1 text-white`
            )}
          >
            <HomeIcon className="h-5 w-5" aria-hidden="true" />
            Home
          </Link>

          <SearchBar />

          <Button variant="ghost" size="icon" asChild>
            <Link
              to={"/wishlist"}
              className="transition-transform hover:scale-110"
            >
              <HeartIcon className="size-6!" aria-hidden="true" />
            </Link>
          </Button>

          <NotificationPanel />
        </div>

        <div className="flex flex-row items-center justify-end gap-x-4">
          <CartHeaderButton />

          <Button className="max-sm:hidden" variant="ghost" size="icon" asChild>
            <Link
              to={"/profile"}
              className="transition-transform hover:scale-110"
            >
              <UserIcon className="size-6!" aria-hidden="true" />
            </Link>
          </Button>

          <Button className="max-sm:hidden" variant="ghost" size="icon" asChild>
            <Link
              to={"/"}
              aria-label="Open Mobile Menu"
              className="transition-transform hover:scale-110"
            >
              <MenuIcon aria-hidden="true" className="size-6!" />
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
