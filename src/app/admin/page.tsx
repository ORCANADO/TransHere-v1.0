import { Suspense } from "react";
import AdminDashboardContent from "./admin-dashboard-content";

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="p-10 text-white">Loading Command Center...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
