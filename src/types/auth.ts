// export enum UserRole {
//   OWNER = "owner",
//   SALES_MANAGER = "sales_manager",
//   SALES_EXECUTIVE = "sales_executive",
// }

// ========================================
export const UserRole = {
  OWNER: "owner",
  SALES_MANAGER: "sales_manager",
  SALES_EXECUTIVE: "sales_executive",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ========================================

export interface User {
  _id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  setAuthData: (data: { user: User; token: string }) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
}
