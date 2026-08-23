import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { Sidebar } from "@/components/SideBar";
import { DashboardCard } from "@/components/ui/DashboardCard";
import {
  // SearchIcon,
  // BellIcon,
  // GridIcon,
  LogoutIcon,
} from "@/components/ui/Icons";
import { motion, type Variants } from "framer-motion";

// Framer Motion Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

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

      <main className="flex-1 overflow-y-auto bg-[#fafafa] p-6 lg:p-8">
        <motion.div
          className="mx-auto max-w-7xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.header
            variants={itemVariants}
            className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700 md:hidden">
                <LogoutIcon />
              </button>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Dashboard
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
              {/* <button className="hidden h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700 md:flex">
                <SearchIcon />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700">
                <BellIcon />
              </button>
              <div className="hidden h-6 w-px bg-gray-200 sm:block"></div>
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50">
                <GridIcon />
              </button> */}
              <button
                onClick={logout}
                className="hidden ml-auto sm:flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 sm:ml-2"
              >
                <LogoutIcon />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </motion.header>

          {/* Dashboard Grid Container */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Left Column: Stat Cards */}
            <div className="flex flex-col gap-6">
              <motion.div variants={itemVariants}>
                <DashboardCard
                  title="Total Leads"
                  value={stats.total}
                  trend="+5%"
                  trendUp={true}
                  description="Leads gathered from web, social, and referral campaigns."
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <DashboardCard
                  title="New Leads"
                  value={stats.new}
                  trend="+8%"
                  trendUp={true}
                  description="Uncontacted leads requiring initial follow-up."
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <DashboardCard
                  title="Qualified Leads"
                  value={stats.qualified}
                  trend="-10%"
                  trendUp={false}
                  description="Verified leads ready for sales team handoff."
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <DashboardCard
                  title="Escalated Leads"
                  value={stats.escalated}
                  trend="+2%"
                  trendUp={true}
                  description="Leads flagged for immediate priority or issue review."
                />
              </motion.div>
            </div>

            {/* Right Column: Charts Container */}
            <div className="flex flex-col gap-6 xl:col-span-2">
              {/* Top Chart */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-1"
              >
                <h3 className="mb-4 text-lg font-bold text-gray-900">
                  Weekly Lead Count Trend
                </h3>
                {/* Placeholder for Line Chart */}
                <div className="flex h-48 sm:h-64 items-end justify-between border-b border-l border-gray-100 pb-2 pl-2">
                  <div className="relative h-full w-full overflow-hidden rounded bg-gradient-to-t from-indigo-50 to-transparent">
                    <svg
                      className="absolute inset-0 h-full w-full"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,70 C15,55 25,85 40,65 C55,45 65,75 80,55 C90,42 95,50 100,35 L100,100 L0,100 Z"
                        className="fill-indigo-100/50"
                      />
                      <path
                        d="M0,70 C15,55 25,85 40,65 C55,45 65,75 80,55 C90,42 95,50 100,35"
                        fill="none"
                        className="stroke-indigo-400"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </div>
                </div>
              </motion.div>

              {/* Bottom Charts (Two Columns) */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <motion.div
                  variants={itemVariants}
                  className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <h3 className="mb-4 text-lg font-bold text-gray-900">
                    Lead Acquisition Source
                  </h3>
                  {/* Placeholder for Bar Chart */}
                  <div className="flex h-48 items-end justify-around gap-2 pt-4">
                    <div className="h-full w-8 sm:w-10 rounded-t bg-indigo-200 transition-all hover:bg-indigo-300"></div>
                    <div className="h-3/5 w-8 sm:w-10 rounded-t bg-indigo-200 transition-all hover:bg-indigo-300"></div>
                    <div className="h-2/5 w-8 sm:w-10 rounded-t bg-indigo-200 transition-all hover:bg-indigo-300"></div>
                    <div className="h-1/5 w-8 sm:w-10 rounded-t bg-indigo-200 transition-all hover:bg-indigo-300"></div>
                    <div className="h-1/5 w-8 sm:w-10 rounded-t bg-indigo-200 transition-all hover:bg-indigo-300"></div>
                  </div>
                  <div className="mt-4 flex justify-around text-xs font-medium text-gray-500">
                    <span>Web</span>
                    <span>Social</span>
                    <span>Referral</span>
                    <span>Email</span>
                    <span>Other</span>
                  </div>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <h3 className="mb-4 text-lg font-bold text-gray-900">
                    Lead Status Breakdown
                  </h3>
                  {/* Placeholder for Donut Chart */}
                  <div className="flex h-48 flex-col sm:flex-row items-center justify-center gap-6">
                    <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full border-[12px] border-blue-500 border-l-red-500 border-t-yellow-500">
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-gray-900">
                          {stats.total}
                        </span>
                        <span className="text-xs font-medium text-gray-500">
                          leads
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col gap-3 sm:gap-2 text-sm font-medium text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500 shadow-sm"></div>{" "}
                        <span className="hidden sm:inline">New</span>{" "}
                        {stats.new}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500 shadow-sm"></div>{" "}
                        <span className="hidden sm:inline">Qualified</span>{" "}
                        {stats.qualified}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-yellow-500 shadow-sm"></div>{" "}
                        <span className="hidden sm:inline">Escalated</span>{" "}
                        {stats.escalated}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
