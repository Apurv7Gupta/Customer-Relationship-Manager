import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

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

export const EscalationList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [response, setResponse] = useState<PaginatedResponse<Escalation> | null>(
    null,
  );
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
    <main className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Escalations</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review customer conversations requiring human attention.
            </p>
          </div>
          <Link to="/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
            Back to dashboard
          </Link>
        </div>

        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <label htmlFor="escalation-status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="escalation-status"
            value={selectedStatus}
            onChange={(event) => changeStatusFilter(event.target.value)}
            className="mt-1 w-full rounded border border-gray-300 p-2 sm:w-56"
          >
            <option value="">All statuses</option>
            {escalationStatuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="rounded-lg bg-white p-8 text-center text-gray-600 shadow-sm" role="status">
            Loading escalations…
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-red-700" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => void loadEscalations()} className="mt-2 text-sm font-medium underline">
              Try again
            </button>
          </div>
        ) : !response || response.data.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center text-gray-600 shadow-sm">
            No escalations match the selected filter.
          </div>
        ) : (
          <section className="overflow-hidden rounded-lg bg-white shadow-sm">
            <div className="divide-y divide-gray-200">
              {response.data.map((escalation) => (
                <Link
                  key={escalation._id}
                  to={`/escalations/${escalation._id}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{escalation.reason}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        Lead {escalation.lead_id} · {new Date(escalation.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 text-xs font-medium">
                      <span className="rounded bg-red-100 px-2 py-1 text-red-800">
                        {escalation.priority} priority
                      </span>
                      <span className="rounded bg-indigo-100 px-2 py-1 text-indigo-800">
                        {escalation.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 p-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => changePage(page - 1)}
                className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {response.meta.page} of {response.meta.total_pages}
              </span>
              <button
                type="button"
                disabled={page >= response.meta.total_pages}
                onClick={() => changePage(page + 1)}
                className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};
