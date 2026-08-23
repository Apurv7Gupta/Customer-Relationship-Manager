import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Sidebar } from "@/components/SideBar";
import { api } from "@/services/api";
import type {
  Escalation,
  EscalationStatus,
  PaginatedResponse,
} from "@/types/crm";

const escalationStatuses: EscalationStatus[] = [
  "open",
  "assigned",
  "in_progress",
  "resolved",
];

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
};

export const EscalationList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [response, setResponse] =
    useState<PaginatedResponse<Escalation> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const selectedStatus = searchParams.get("status") ?? "";

  const loadEscalations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<PaginatedResponse<Escalation>>(
        "/api/escalations",
        {
          params: {
            page,
            page_size: 10,
            status: selectedStatus || undefined,
          },
        },
      );
      setResponse(result.data);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Unable to load escalations."));
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus]);

  useEffect(() => {
    void loadEscalations();
  }, [loadEscalations]);

  const changeStatusFilter = (status: string) => {
    setSearchParams({ page: "1", ...(status ? { status } : {}) });
  };

  const changePage = (nextPage: number) => {
    setSearchParams({
      page: String(nextPage),
      ...(selectedStatus ? { status: selectedStatus } : {}),
    });
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans text-gray-800">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#fafafa] p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Escalations
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Review customer conversations requiring human attention.
              </p>
            </div>
          </header>

          {/* Filters Box */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
            <label
              htmlFor="escalation-status"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              Status Filter
            </label>
            <select
              id="escalation-status"
              value={selectedStatus}
              onChange={(event) => changeStatusFilter(event.target.value)}
              className="block w-full sm:w-64 rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All statuses</option>
              {escalationStatuses.map((status) => (
                <option key={status} value={status} className="capitalize">
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Content Area */}
          {loading ? (
            <div
              className="rounded-xl border border-gray-200 bg-white p-8 text-center font-medium text-gray-500"
              role="status"
            >
              Loading escalations…
            </div>
          ) : error ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700"
              role="alert"
            >
              <p className="font-medium">{error}</p>
              <button
                type="button"
                onClick={() => void loadEscalations()}
                className="mt-3 inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-700"
              >
                Try again
              </button>
            </div>
          ) : !response || response.data.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center font-medium text-gray-500">
              No escalations match the selected filter.overflow-hidden
              rounded-xl border border-gray-200 bg-white
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="divide-y divide-gray-100">
                {response.data.map((escalation) => (
                  <Link
                    key={escalation._id}
                    to={`/escalations/${escalation._id}`}
                    className="block p-5 transition-colors hover:bg-gray-50/80"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-gray-900">
                          {escalation.reason}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Lead {escalation.lead_id} &bull;{" "}
                          {new Date(escalation.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                        <span className="rounded-md bg-red-50 px-2.5 py-1 text-red-700 border border-red-100">
                          {escalation.priority} priority
                        </span>
                        <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-indigo-700 border border-indigo-100">
                          {escalation.status.replaceAll("_", " ")}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 p-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => changePage(page - 1)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm font-medium text-gray-600">
                  Page {response.meta.page} of {response.meta.total_pages}
                </span>
                <button
                  type="button"
                  disabled={page >= response.meta.total_pages}
                  onClick={() => changePage(page + 1)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
