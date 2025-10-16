import {
  HomeIcon,
  HeartIcon,
  BellIcon,
  ShoppingCartIcon,
  UserIcon,
  MenuIcon
} from "lucide-react";
import { SearchBar } from "@/components/layout/Header/SearchBar.tsx";

export default function Header() {
  return (
    <header className="w-full p-6">
      <nav className="mx-auto grid max-w-5xl grid-cols-3 items-center">
        <div>
          <a
            href="#"
            className="flex flex-row items-center gap-x-2 text-2xl font-bold text-slate-800"
          >
            <img src="src/assets/react.svg" alt="Logo" className="h-8" />
            <span className="max-sm:hidden">Partlist</span>
          </a>
        </div>
        <div className="flex flex-row items-center justify-center gap-x-6 max-sm:[&>*:not(:nth-child(2))]:hidden">
          <a
            href="#"
            className="flex flex-row items-center gap-x-1 rounded-full bg-slate-900 px-4 py-1 text-white"
          >
            <HomeIcon className="h-5 w-5" />
            Home
          </a>

          <SearchBar />

          <a href="#" className="transition-transform hover:scale-110">
            <HeartIcon className="h-6 w-6" />
          </a>
          <a href="#" className="transition-transform hover:scale-110">
            <BellIcon className="h-6 w-6" />
          </a>
        </div>
        <div className="flex flex-row items-center justify-end gap-x-4">
          <a href="#" className="transition-transform hover:scale-110">
            <ShoppingCartIcon className="h-6 w-6" />
          </a>
          <a href="#" className="transition-transform hover:scale-110">
            <UserIcon className="h-6 w-6" />
          </a>
          <a href="#" className="transition-transform hover:scale-110">
            <MenuIcon />
          </a>
        </div>
      </nav>
    </header>
  );
}
