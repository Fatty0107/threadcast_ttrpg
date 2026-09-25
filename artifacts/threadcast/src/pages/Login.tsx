import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { username, password } }, {
      onSuccess: (data) => {
        setUser(data);
        setLocation("/characters");
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background relative overflow-hidden px-4 py-12">
      <div className="tc-login-decoration absolute inset-0 pointer-events-none" aria-hidden="true" />

      <div className="tc-login-panel relative z-10 w-full max-w-md p-6 sm:p-10 bg-card border border-border">
        <div className="text-center mb-9">
          <div className="inline-block mb-2">
            <span className="text-primary font-mono text-xs tracking-[0.4em] uppercase">⟨ Enter ⟩</span>
          </div>
          <h1 className="text-[clamp(2.2rem,9vw,3rem)] font-[family-name:'Cinzel',serif] text-primary mb-2 tracking-wider">
            THREADCAST
          </h1>
          <p className="text-sm font-mono tracking-[0.3em] text-muted-foreground uppercase">World of Aethros</p>
          <div className="mt-3 flex items-center gap-2 justify-center">
            <div className="h-px w-12 bg-primary/30" />
            <div className="w-1 h-1 rounded-full bg-primary/50" />
            <div className="h-px w-12 bg-primary/30" />
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="login-username" className="font-mono text-muted-foreground text-xs tracking-widest uppercase">Identifier</Label>
            <Input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 font-mono bg-background border-border focus:border-primary transition-colors"
              data-testid="input-username"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password" className="font-mono text-muted-foreground text-xs tracking-widest uppercase">Passphrase</Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 font-mono bg-background border-border focus:border-primary transition-colors"
              data-testid="input-password"
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-mono tracking-[0.12em] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors uppercase"
            disabled={loginMutation.isPending}
            data-testid="button-submit-login"
          >
            {loginMutation.isPending ? "Connecting..." : "Enter the Weave"}
          </Button>

          {loginMutation.isError && (
            <p role="alert" className="text-sm text-destructive text-center font-mono">
              Access denied. Check your credentials.
            </p>
          )}
        </form>

      </div>
    </div>
  );
}
