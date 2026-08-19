import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./protectedRoutes";
import { UserRole } from "../types/auth";
import { LoginPage } from "../features/auth/LoginPage";
import { Dashboard } from "../features/dashboard/Dashboard";
import { LeadList } from "../features/leads/LeadList";
import { LeadForm } from "../features/leads/LeadForm";
import { LeadDetail } from "../features/leads/LeadDetail";

const UserManagement = () => <div>User Management</div>;
const Unauthorized = () => <div>Unauthorized Access</div>;

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Lead routes*/}
          <Route path="/leads" element={<LeadList />} />

          <Route path="/leads/:id" element={<LeadDetail />} />
        </Route>

        {/* Owner Only Routes */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.OWNER]} />}>
          <Route path="/users" element={<UserManagement />} />
          <Route path="/leads/new" element={<LeadForm />} />
          <Route path="/leads/:id/edit" element={<LeadForm />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
