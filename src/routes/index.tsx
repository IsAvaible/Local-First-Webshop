import { createFileRoute } from "@tanstack/react-router";
import Browse from "@/components/Browse.tsx";
import Header from "@/components/layout/Header/Header.tsx";
import Footer from "@/components/layout/Footer/Footer.tsx";

export const Route = createFileRoute("/")({
  component: Index
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-slate-800 dark:bg-gray-900 dark:text-slate-200">
      <Header />
      <main className="flex-grow">
        <Browse />
      </main>
      <Footer />
    </div>
  );
}
