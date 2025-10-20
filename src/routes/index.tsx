import { createFileRoute } from "@tanstack/react-router";
import Browse from "@/components/Browse.tsx";

export const Route = createFileRoute("/")({
  component: Index
});

function Index() {
  return <Browse />;
}
