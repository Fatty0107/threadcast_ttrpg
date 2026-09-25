import { ReactNode, useState } from "react";
import { useGetMe, useLogout, type AuthUser } from "@workspace/api-client-react";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userOverride, setUser] = useState<AuthUser | null | undefined>(undefined);
  const { data: me, isLoading, error } = useGetMe({ query: { retry: false } as any });
  const logoutMutation = useLogout();
  // A fresh page load must see the fetched user on the same render that
  // isLoading turns false; mirroring it in an effect lets protected routes
  // redirect to login for one render even with a valid session.
  const user = userOverride !== undefined ? userOverride : error ? null : (me ?? null);

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
