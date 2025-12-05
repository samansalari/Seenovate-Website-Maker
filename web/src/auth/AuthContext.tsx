import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ApiClient } from "@/api/api_client";
import { getStoredToken, setStoredToken, clearStoredToken } from "@/api/index";

interface User {
  id: number;
  email: string;
  name: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      if (token) {
        try {
          const client = ApiClient.initialize({
            getToken: getStoredToken,
            onAuthError: () => logout(),
          });
          const userData = await client.getMe();
          setUser(userData);
        } catch (error) {
          console.error("Auth initialization failed:", error);
          clearStoredToken();
        }
      } else {
        // Initialize client even without token for public endpoints
        ApiClient.initialize({
          getToken: getStoredToken,
          onAuthError: () => logout(),
        });
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (token: string, userData: User) => {
    setStoredToken(token);
    setUser(userData);
    // Re-initialize client with new token
    ApiClient.initialize({
      getToken: getStoredToken,
      onAuthError: () => logout(),
    });
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

