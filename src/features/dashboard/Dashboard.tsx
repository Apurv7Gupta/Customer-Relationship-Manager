import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    qualified: 0,
    escalated: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [leadsRes, newRes, qualRes, escRes] = await Promise.all([
          api.get("/api/leads", { params: { page_size: 1 } }),
          api.get("/api/leads", { params: { status: "new", page_size: 1 } }),
          api.get("/api/leads", {
            params: { status: "qualified", page_size: 1 },
          }),
          api.get("/api/escalations", { params: { page_size: 1 } }),
        ]);
        setStats({
          total: leadsRes.data?.meta?.total || 0,
          new: newRes.data?.meta?.total || 0,
          qualified: qualRes.data?.meta?.total || 0,
          escalated: escRes.data?.meta?.total || 0,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      }
    };
    fetchStats();
  }, []);

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
          <Link to="/leads" className="block h-full">
            <DashboardCard title="Total Leads" value={stats.total} />
          </Link>
          <Link to="/leads?page=1&status=new&search=" className="block h-full">
            <DashboardCard title="New Leads" value={stats.new} />
          </Link>
          <Link
            to="/leads?page=1&status=qualified&search="
            className="block h-full"
          >
            <DashboardCard title="Qualified Leads" value={stats.qualified} />
          </Link>
          <Link to="/escalations" className="block h-full">
            <DashboardCard title="Escalated" value={stats.escalated} />
          </Link>
        </div>
      </div>
      <div className="mt-10 flex flex-col items-center gap-4">
        <Link
          to="/leads"
          className="w-48 text-center bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700"
        >
          View All Leads
        </Link>
        {user?.role === "owner" && (
          <Link
            to="/users"
            className="w-48 text-center bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700"
          >
            Manage Users
          </Link>
        )}
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
