import { createRouter as createTanstackRouter } from "@tanstack/react-router";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import "./index.css";

// Create a new router instance
export function getRouter() {
  return createTanstackRouter({
    routeTree,
    defaultPreload: "viewport",
    scrollRestoration: true
  });
}
