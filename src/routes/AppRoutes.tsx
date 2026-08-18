import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { ProtectedRoute } from "./protectedRoutes";
import { UserRole } from "../types/auth";

// Placeholder components
const Dashboard = () => <div>Dashboard</div>;
const LeadList = () => <div>Leads</div>;
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
          <Route path="/leads" element={<LeadList />} />
        </Route>

        {/* Owner Only Routes */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.OWNER]} />}>
          <Route path="/users" element={<UserManagement />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
