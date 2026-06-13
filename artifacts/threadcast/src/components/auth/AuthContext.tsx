import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { AuthUser } from "@workspace/api-client-react";
import { useGetMe, useLogout } from "@workspace/api-client-react";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  
  const { data: me, isLoading, error } = useGetMe({ query: { retry: false } });
  const logoutMutation = useLogout();

  useEffect(() => {
    if (me) {
      setUser(me);
    } else if (error) {
      setUser(null);
    }
  }, [me, error]);

  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setUser(null);
      }
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout }}>
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
