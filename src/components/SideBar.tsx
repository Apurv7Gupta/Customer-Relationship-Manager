import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  HomeIcon,
  ChatIcon,
  PlusIcon,
  FilterIcon,
  SunIcon,
  ShieldIcon,
  AlertIcon,
  UsersIcon,
  ListIcon,
} from "../components/ui/Icons";

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  return (
    <aside className="w-64 flex flex-col justify-between border-r border-gray-200 bg-[#fbfbfb] p-4 shrink-0">
      <div>
        {/* User Profile */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 text-xl font-semibold text-yellow-900">
            {user?.email ? user.email.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900">User</span>
            <span className="text-xs text-gray-500">
              {user?.email || "owner@example.com"}
            </span>
          </div>
        </div>

        {/* Top Actions */}
        <div className="mb-6 flex gap-2">
          <Link
            to="/dashboard"
            className="flex h-8 w-10 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
          >
            <HomeIcon />
          </Link>
          <button className="flex h-8 w-10 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600">
            <ChatIcon />
          </button>
          {user?.role === "owner" && (
            <Link
              to="/leads/new"
              className="flex h-8 flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 text-gray-700"
            >
              <PlusIcon /> New Lead
            </Link>
          )}
        </div>

        {/* Navigation Links */}
        <nav>
          <h3 className="mb-4 text-sm font-semibold text-gray-900">
            Leads Navigation
          </h3>
          <ul className="space-y-4">
            <li>
              <Link
                to="/leads"
                className="flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <FilterIcon />
                </div>
                All Leads
              </Link>
            </li>
            <li>
              <Link
                to="/leads?page=1&status=new&search="
                className="flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-500">
                  <SunIcon />
                </div>
                New Leads
              </Link>
            </li>
            <li>
              <Link
                to="/leads?page=1&status=qualified&search="
                className="flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                  <ShieldIcon />
                </div>
                Qualified Leads
              </Link>
            </li>
            <li>
              {user?.role === "owner" ||
                (user?.role === "sales_manager" && (
                  <Link
                    to="/escalations"
                    className="flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-500">
                      <AlertIcon />
                    </div>
                    Escalated Leads
                  </Link>
                ))}
            </li>
          </ul>
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-3">
        {user?.role === "owner" && (
          <Link
            to="/users"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <UsersIcon /> Manage Users
          </Link>
        )}
        <Link
          to="/leads"
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <ListIcon /> View All Leads
        </Link>
      </div>
    </aside>
  );
};
