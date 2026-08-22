import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { Sidebar } from "@/components/SideBar";
import { DashboardCard } from "@/components/ui/Dashboardcard";
import {
  SearchIcon,
  BellIcon,
  GridIcon,
  LogoutIcon,
} from "@/components/ui/Icons";

export const Dashboard: React.FC = () => {
  const { logout } = useAuth();
  const [stats, setStats] = useState({
    total: 12,
    new: 8,
    qualified: 1,
    escalated: 3,
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
    <div className="flex h-screen bg-[#f8f9fa] font-sans text-gray-800">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-[#fafafa] p-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="text-gray-500 hover:text-gray-700">
              <SearchIcon />
            </button>
            <button className="text-gray-500 hover:text-gray-700">
              <BellIcon />
            </button>
            <h1 className="ml-4 text-4xl font-bold tracking-tight text-gray-900">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
              ...
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
              ?
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
              <GridIcon />
            </button>
            <button
              onClick={logout}
              className="ml-2 flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700"
            >
              <LogoutIcon /> Log Out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="flex flex-col gap-6">
            <DashboardCard
              title="Total Leads"
              value={stats.total}
              trend="+5%"
              trendUp={true}
              description="Leads gathered from web, social, and referral campaigns."
            />
            <DashboardCard
              title="New Leads"
              value={stats.new}
              trend="+8%"
              trendUp={true}
              description="Uncontacted leads requiring initial follow-up."
            />
            <DashboardCard
              title="Qualified Leads"
              value={stats.qualified}
              trend="-10%"
              trendUp={false}
              description="Verified leads ready for sales team handoff."
            />
            <DashboardCard
              title="Escalated Leads"
              value={stats.escalated}
              trend="+2%"
              trendUp={true}
              description="Leads flagged for immediate priority or issue review."
            />
          </div>

          <div className="flex flex-col gap-6 xl:col-span-2">
            <div className="flex-1 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-medium text-gray-800">
                Weekly Lead Count Trend
              </h3>
              <div className="flex h-64 items-end justify-between border-b border-l border-gray-100 pb-2 pl-2">
                <div className="flex h-full w-full items-end rounded bg-gradient-to-t from-indigo-50 to-transparent">
                  <div className="h-2/3 w-full rounded-tl-full rounded-tr-full border-t-2 border-indigo-400 bg-indigo-100/50 opacity-60"></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-medium text-gray-800">
                  Lead Acquisition Source
                </h3>
                <div className="flex h-48 items-end justify-around gap-2 pt-4">
                  <div className="h-full w-10 rounded-t bg-indigo-200"></div>
                  <div className="h-3/5 w-10 rounded-t bg-indigo-200"></div>
                  <div className="h-2/5 w-10 rounded-t bg-indigo-200"></div>
                  <div className="h-1/5 w-10 rounded-t bg-indigo-200"></div>
                  <div className="h-1/5 w-10 rounded-t bg-indigo-200"></div>
                </div>
                <div className="mt-2 flex justify-around text-xs text-gray-500">
                  <span>Website</span>
                  <span>Social</span>
                  <span>Referral</span>
                  <span>Email</span>
                  <span>Other</span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-medium text-gray-800">
                  Lead Status Breakdown
                </h3>
                <div className="flex h-48 items-center justify-center gap-6">
                  <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-[12px] border-blue-500 border-l-red-500 border-t-yellow-500">
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-bold">{stats.total}</span>
                      <span className="text-xs text-gray-500">leads</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-blue-500"></div> New{" "}
                      {stats.new}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-red-500"></div>{" "}
                      Qualified {stats.qualified}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-yellow-500"></div>{" "}
                      Escalated {stats.escalated}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
