import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/")({
  component: () => (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <App />
    </ClientOnly>
  ),
});
