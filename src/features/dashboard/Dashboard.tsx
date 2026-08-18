import React from "react";
import { useAuth } from "@/context/AuthContext";

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between bg-white p-6 shadow rounded-lg mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Welcome back, {user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Logout
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Scaffolding cards (visual summary sections) */}
          <DashboardCard title="Total Leads" value="0" />
          <DashboardCard title="New Leads" value="0" />
          <DashboardCard title="Qualified Leads" value="0" />
          <DashboardCard title="Escalated" value="0" />
        </div>
      </div>
    </div>
  );
};

const DashboardCard: React.FC<{ title: string; value: string | number }> = ({
  title,
  value,
}) => (
  <div className="overflow-hidden rounded-lg bg-white shadow">
    <div className="p-5">
      <dt className="truncate text-sm font-medium text-gray-500">{title}</dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
        {value}
      </dd>
    </div>
  </div>
);
