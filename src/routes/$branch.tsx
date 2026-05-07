import { createFileRoute, Outlet } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/$branch")({
  component: BranchLayout,
});

function BranchLayout() {
  return (
    <ProtectedRoute>
      <Layout><Outlet /></Layout>
    </ProtectedRoute>
  );
}
