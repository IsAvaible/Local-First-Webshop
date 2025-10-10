import type { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/*<aside className="w-64 bg-gray-100 p-4">*/}
      {/*  <h2 className="text-lg font-semibold">Navigation</h2>*/}
      {/*  /!* Navigation links will go here *!/*/}
      {/*</aside>*/}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
