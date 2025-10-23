import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index
});

function Index() {
  return (
    <>
      <h1>Index</h1>
      <Link to={"/search"}>Go to search.</Link>
    </>
  );
}
