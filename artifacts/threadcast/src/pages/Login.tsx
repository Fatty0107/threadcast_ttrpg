import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth/AuthContext";
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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 3 + 1 + "px",
              height: Math.random() * 3 + 1 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              background: `hsl(28 55% ${40 + Math.random() * 20}%)`,
              opacity: Math.random() * 0.6 + 0.1,
              animation: `pulse ${Math.random() * 5 + 3}s infinite alternate`,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md p-8 bg-card border border-border shadow-2xl shadow-primary/10">
        <div className="text-center mb-10">
          <div className="inline-block mb-2">
            <span className="text-primary/40 font-mono text-xs tracking-[0.4em] uppercase">⟨ Enter ⟩</span>
          </div>
          <h1 className="text-5xl font-[family-name:'Cinzel',serif] text-primary mb-2 tracking-wider drop-shadow-[0_0_20px_rgba(180,120,60,0.3)]">
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
            <Label className="font-mono text-muted-foreground text-xs tracking-widest uppercase">Identifier</Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="font-mono bg-background/80 border-border/60 focus:border-primary/60 transition-colors"
              data-testid="input-username"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-muted-foreground text-xs tracking-widest uppercase">Passphrase</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono bg-background/80 border-border/60 focus:border-primary/60 transition-colors"
              data-testid="input-password"
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full font-mono tracking-[0.2em] bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:shadow-[0_0_20px_rgba(180,120,60,0.3)] uppercase"
            disabled={loginMutation.isPending}
            data-testid="button-submit-login"
          >
            {loginMutation.isPending ? "Connecting..." : "Enter the Weave"}
          </Button>

          {loginMutation.isError && (
            <p className="text-sm text-destructive text-center font-mono animate-in fade-in">
              ✗ Access denied. Check your credentials.
            </p>
          )}
        </form>

        <p className="text-center text-xs font-mono text-muted-foreground/40 mt-8 tracking-wider">
          AETHROS WEAVE NETWORK v2.4
        </p>
      </div>
    </div>
  );
}
