import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/services/api";

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

  if (loading) return <div className="p-8">Loading form...</div>;

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-8 rounded shadow">
      <div className="flex items-center mb-6 space-x-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-3 py-1 text-sm font-medium text-white bg-blue-700 border border-gray-300 rounded shadow-sm hover:bg-blue-800"
        >
          &larr;
        </button>
        <h2 className="text-2xl font-bold">
          {isEdit ? "Edit Lead" : "Create Lead"}
        </h2>
      </div>
      {globalError && (
        <div className="mb-4 bg-red-50 text-red-700 p-3 rounded">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              {...register("name")}
              className="mt-1 block w-full border rounded p-2"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input
              {...register("phone")}
              className="mt-1 block w-full border rounded p-2"
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">
                {errors.phone.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              {...register("email")}
              className="mt-1 block w-full border rounded p-2"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Source</label>
            <input
              {...register("source")}
              className="mt-1 block w-full border rounded p-2"
            />
            {errors.source && (
              <p className="text-red-500 text-xs mt-1">
                {errors.source.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Lead"}
          </button>
        </div>
      </form>
    </div>
  );
};
