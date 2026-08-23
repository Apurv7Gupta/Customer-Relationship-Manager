import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { AuthContextType, User } from "../types/auth";
import { UserRole } from "../types/auth";

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user_data");
    // explicit check for literal "undefined" string (Discards corrupted data)
    if (!storedUser || storedUser === "undefined") return null;
    try {
      return JSON.parse(storedUser);
    } catch {
      localStorage.removeItem("user_data");
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("jwt_token"),
  );

  const setAuthData = (data: { user: User; token: string }) => {
    // strict guard clause to guarantee undefined data never hits state or localStorage.
    if (!data || !data.user || !data.token) {
      console.error("Attempted to store invalid auth data", data);
      return;
    }

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("user_data", JSON.stringify(data.user));
    localStorage.setItem("jwt_token", data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user_data");
    localStorage.removeItem("jwt_token");
    sessionStorage.removeItem("sidebarAnimated");
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        setAuthData,
        logout,
        isAuthenticated: !!token,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
