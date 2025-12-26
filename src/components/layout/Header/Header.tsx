import { useState, useEffect } from "react"; // 1. Import hooks
import {
  HomeIcon,
  HeartIcon,
  BellIcon,
  UserIcon,
  MenuIcon,
  PackageOpenIcon
} from "lucide-react";
import { SearchBar } from "@/components/layout/Header/SearchBar.tsx";
import { CartHeaderButton } from "@/components/cart/CartHeaderButton.tsx";
import { ClientOnly } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    // 4. Conditionally add shadow and transition classes
    <header
      className={`sticky top-0 z-10 w-full bg-gray-50 p-6 transition-shadow duration-300 dark:bg-gray-900 ${
        isScrolled ? "shadow-md" : ""
      }`}
    >
      <nav className="mx-auto grid max-w-5xl grid-cols-3 items-center">
        <div>
          <Link
            to={"/"}
            className="flex flex-row items-center gap-x-2 text-2xl font-bold text-slate-800"
          >
            <PackageOpenIcon className="h-8 w-8" />
            <span className="max-sm:hidden">Partslist</span>
          </Link>
        </div>
        <div className="flex flex-row items-center justify-center gap-x-6 max-sm:[&>*:not(:nth-child(2))]:hidden">
          <Link
            to={"/"}
            className="flex flex-row items-center gap-x-1 rounded-full bg-slate-900 px-4 py-1 text-white"
          >
            <HomeIcon className="h-5 w-5" />
            Home
          </Link>

          <ClientOnly>
            <SearchBar />
          </ClientOnly>

          <Link to={"/"} className="transition-transform hover:scale-110">
            <HeartIcon className="h-6 w-6" />
          </Link>
          <Link to={"/"} className="transition-transform hover:scale-110">
            <BellIcon className="h-6 w-6" />
          </Link>
        </div>
        <div className="flex flex-row items-center justify-end gap-x-4">
          <CartHeaderButton />
          <Link to={"/login"} className="transition-transform hover:scale-110">
            <UserIcon className="h-6 w-6" />
          </Link>
          <Link to={"/"} className="transition-transform hover:scale-110">
            <MenuIcon />
          </Link>
        </div>
      </nav>
    </header>
  );
}
