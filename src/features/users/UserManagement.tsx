import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/services/api";
import { UserRole } from "@/types/auth";
import type { User } from "@/types/auth";
import { Sidebar } from "@/components/SideBar";
import { useNavigate } from "react-router-dom";
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

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(
    [UserRole.OWNER, UserRole.SALES_MANAGER, UserRole.SALES_EXECUTIVE],
    { message: "Invalid role selected" },
  ),
});

type UserFormData = z.infer<typeof userSchema>;

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: "", password: "", role: UserRole.SALES_EXECUTIVE },
  });

  const fetchUsers = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await api.get<User[]>("/api/users");
      setUsers(response.data);
    } catch (err: any) {
      setFetchError(err.response?.data?.detail || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onSubmit = async (data: UserFormData) => {
    setFormError(null);
    try {
      await api.post("/api/users", data);
      reset();
      fetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Failed to create user.");
    }
  };

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
            className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
            >
              &larr;
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                User Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create and manage access for your team members.
              </p>
            </div>
          </motion.header>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* User Creation Form */}
            <motion.div variants={itemVariants} className="lg:col-span-1">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="mb-6 text-lg font-bold text-gray-900">
                  Create New User
                </h2>

                {formError && (
                  <div
                    className="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700"
                    role="alert"
                  >
                    {formError}
                  </div>
                )}

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-5"
                  noValidate
                >
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Email
                    </label>
                    <input
                      type="email"
                      {...register("email")}
                      disabled={isSubmitting}
                      className="mt-2 block w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-xs font-medium text-red-500">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Password
                    </label>
                    <input
                      type="password"
                      {...register("password")}
                      disabled={isSubmitting}
                      className="mt-2 block w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                    />
                    {errors.password && (
                      <p className="mt-1.5 text-xs font-medium text-red-500">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Role
                    </label>
                    <select
                      {...register("role")}
                      disabled={isSubmitting}
                      className="mt-2 block w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 capitalize"
                    >
                      {Object.values(UserRole).map((role) => (
                        <option key={role} value={role}>
                          {role.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                    {errors.role && (
                      <p className="mt-1.5 text-xs font-medium text-red-500">
                        {errors.role.message}
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex h-8 w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 hover:cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? "Creating..." : "Create User"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>

            {/* User List */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-100 px-6 py-5">
                  <h3 className="text-lg font-bold text-gray-900">
                    Active Users
                  </h3>
                </div>

                {loading ? (
                  <div className="p-8 text-center font-medium text-gray-500">
                    Loading users...
                  </div>
                ) : fetchError ? (
                  <div className="p-8 text-center font-medium text-red-500">
                    {fetchError}
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-8 text-center font-medium text-gray-500">
                    No active users found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Email
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Role
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {users.map((user) => (
                          <tr
                            key={user._id}
                            className="transition-colors hover:bg-gray-50/50"
                          >
                            <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                              {user.email}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-600">
                              {user.role.replace("_", " ")}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                              <span className="inline-flex items-center rounded-md border border-green-100 bg-green-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-green-700">
                                Active
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
