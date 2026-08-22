import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
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
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar when a navigation link is clicked on mobile
  const handleNavClick = () => setIsOpen(false);
  const hasAnimated = sessionStorage.getItem("sidebarAnimated") === "true";

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Floating Action Button (Hamburger) */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 md:hidden ${
          isOpen ? "hidden" : "flex"
        }`}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Animated Sidebar Wrapper */}
      <motion.div
        initial={hasAnimated ? { x: 0, opacity: 1 } : { x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        onAnimationComplete={() =>
          sessionStorage.setItem("sidebarAnimated", "true")
        }
        className="z-50 shrink-0 md:w-64"
      >
        <aside
          className={`fixed inset-y-0 left-0 flex h-full w-64 flex-col justify-between border-r border-gray-200 bg-[#fbfbfb] p-4 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
            isOpen
              ? "translate-x-0 shadow-2xl"
              : "-translate-x-full md:shadow-none"
          }`}
        >
          <div>
            {/* User Profile & Mobile Close Button */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-xl font-semibold text-yellow-900">
                  {user?.email ? user.email.charAt(0).toUpperCase() : "?"}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold text-gray-900">User</span>
                  <span className="truncate text-xs text-gray-500">
                    {user?.email || "owner@example.com"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200 md:hidden"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Top Actions */}
            <div className="mb-6 flex gap-2">
              <Link
                to="/dashboard"
                onClick={handleNavClick}
                className="flex h-8 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
              >
                <HomeIcon />
              </Link>
              <button className="flex h-8 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50">
                <ChatIcon />
              </button>
              {user?.role === "owner" && (
                <Link
                  to="/leads/new"
                  onClick={handleNavClick}
                  className="flex h-8 flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <PlusIcon /> New Lead
                </Link>
              )}
            </div>

            {/* Navigation Links */}
            <nav>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Leads Navigation
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/leads"
                    onClick={handleNavClick}
                    className="flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                      <FilterIcon />
                    </div>
                    All Leads
                  </Link>
                </li>
                <li>
                  <Link
                    to="/leads?page=1&status=new&search="
                    onClick={handleNavClick}
                    className="flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-500">
                      <SunIcon />
                    </div>
                    New Leads
                  </Link>
                </li>
                <li>
                  <Link
                    to="/leads?page=1&status=qualified&search="
                    onClick={handleNavClick}
                    className="flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                      <ShieldIcon />
                    </div>
                    Qualified Leads
                  </Link>
                </li>
                <li>
                  {(user?.role === "owner" ||
                    user?.role === "sales_manager") && (
                    <Link
                      to="/escalations"
                      onClick={handleNavClick}
                      className="flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-500">
                        <AlertIcon />
                      </div>
                      Escalated Leads
                    </Link>
                  )}
                </li>
              </ul>
            </nav>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col gap-3">
            {user?.role === "owner" && (
              <Link
                to="/users"
                onClick={handleNavClick}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                <UsersIcon /> Manage Users
              </Link>
            )}
            <Link
              to="/leads"
              onClick={handleNavClick}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <ListIcon /> View All Leads
            </Link>
          </div>
        </aside>
      </motion.div>
    </>
  );
};
