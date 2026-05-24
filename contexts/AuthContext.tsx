import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

/**
 * User type matching the database schema
 */
export interface AuthUser {
  id: number;
  email: string | null;
  name: string | null;
  role: "user" | "admin";
  hubMemberRole?: "family_admin" | "family_member" | "caregiver";
  hubId?: string;
  languagePreference: string;
  openId: string;
  loginMethod?: string;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

/**
 * Auth context interface
 */
interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

/**
 * Create auth context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component
 * 
 * Wraps the entire app to provide global auth state
 * Manages user session, login/logout, and loading states
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // TODO: Check if session exists and validate with backend
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Auth check failed");
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Call login mutation via tRPC
      // For now, this is a placeholder
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      setIsLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Call logout mutation via tRPC
      setCurrentUser(null);
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Logout failed";
      setError(message);
      setIsLoading(false);
      throw err;
    }
  };

  const value: AuthContextType = {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading,
    login,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 * 
 * Usage:
 * const { currentUser, isAuthenticated, login, logout } = useAuthContext();
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
