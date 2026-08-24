import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/SideBar";
import { LogoutIcon } from "@/components/ui/Icons";

const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  source: z.string().min(1, "Source is required"),
  status: z.enum([
    "new",
    "contacted",
    "qualified",
    "meeting_scheduled",
    "proposal_sent",
    "negotiation",
    "won",
    "lost",
  ]),
  priority: z.enum(["low", "medium", "high"]),
  requirements: z.string().optional(),
  estimated_value: z.number().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

export const LeadForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const isEdit = Boolean(id);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: { status: "new", priority: "medium" },
  });

  useEffect(() => {
    if (isEdit) {
      api
        .get(`/api/leads/${id}`)
        .then((res) => {
          reset(res.data);
          setLoading(false);
        })
        .catch((_err) => {
          setGlobalError("Failed to load lead data");
          setLoading(false);
        });
    }
  }, [id, reset, isEdit]);

  const onSubmit = async (data: LeadFormData) => {
    setGlobalError(null);
    try {
      if (isEdit) {
        await api.patch(`/api/leads/${id}`, data);
      } else {
        await api.post("/api/leads", data);
      }
      navigate("/leads");
    } catch (error: any) {
      setGlobalError(
        error.response?.data?.detail || "An error occurred during submission.",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8f9fa] font-medium text-gray-500">
        Loading form...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans text-gray-800">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-[#fafafa] p-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:cursor-pointer"
            >
              &larr;
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {isEdit ? "Edit Lead" : "Create New Lead"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="hidden ml-auto sm:flex items-center gap-2 rounded-lg bg-red-600 px-3 py-[5px] text-sm text-white transition-colors hover:bg-red-700 sm:ml-2"
            >
              <LogoutIcon />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </header>

        <div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-8">
          {globalError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Full Name
                </label>
                <input
                  {...register("name")}
                  placeholder="e.g. Jane Doe"
                  className="mt-2 block w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {errors.name && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Phone Number
                </label>
                <input
                  {...register("phone")}
                  placeholder="+1 (555) 000-0000"
                  className="mt-2 block w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {errors.phone && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Email Address
                </label>
                <input
                  type="email"
                  {...register("email")}
                  placeholder="jane@example.com"
                  className="mt-2 block w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Acquisition Source
                </label>
                <input
                  {...register("source")}
                  placeholder="Website, Social, Referral..."
                  className="mt-2 block w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {errors.source && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {errors.source.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg border border-gray-200 bg-blue-300 px-5 py-2.5 text-sm font-medium text-black hover:bg-blue-400 hover:cursor-pointer"
              >
                {isSubmitting
                  ? "Saving..."
                  : isEdit
                    ? "Update Lead"
                    : "Create Lead"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
