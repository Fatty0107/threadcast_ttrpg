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
      {/* Animated canvas background placeholder */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        {Array.from({ length: 10 }).map((_, i) => (
          <div 
            key={i} 
            className="absolute bg-primary/30"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: '100%',
              left: Math.random() * 100 + '%',
              animation: `pulse ${Math.random() * 4 + 2}s infinite alternate`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md p-8 bg-card border border-border shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-[family-name:'Cinzel',serif] text-primary mb-2">THREADCAST</h1>
          <p className="text-sm font-mono tracking-widest text-muted-foreground uppercase">World of Aethros</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label className="font-mono text-muted-foreground">IDENTIFIER</Label>
            <Input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              className="font-mono bg-background border-input"
              data-testid="input-username"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-muted-foreground">PASSPHRASE</Label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono bg-background border-input"
              data-testid="input-password"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full font-mono tracking-widest bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loginMutation.isPending}
            data-testid="button-submit-login"
          >
            {loginMutation.isPending ? "CONNECTING..." : "ENTER THE WEAVE"}
          </Button>

          {loginMutation.isError && (
            <p className="text-sm text-destructive text-center font-mono">Connection failed.</p>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-border/50 text-xs font-mono text-muted-foreground space-y-2">
          <p>DEMO CREDENTIALS:</p>
          <p>Player: aria_solforge / embersong</p>
          <p>Weavekeeper: weavekeeper_dm / threadpuller</p>
        </div>
      </div>
    </div>
  );
}
