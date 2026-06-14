import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { DiceRollerProvider } from "@/components/shared/DiceRoller";
import { RollLog } from "@/components/shared/RollLog";
import Login from "@/pages/Login";
import Characters from "@/pages/Characters";
import CharacterSheet from "@/pages/CharacterSheet";
import Compendium from "@/pages/Compendium";
import Weavekeeper from "@/pages/Weavekeeper";
import Navbar from "@/components/layout/Navbar";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, path }: { component: React.ComponentType; path: string }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground font-mono text-sm tracking-widest">
          CONNECTING TO WEAVE...
        </div>
      </Route>
    );
  }
  if (!user) return <Route path={path}><Redirect to="/login" /></Route>;

  return (
    <Route path={path}>
      <Navbar />
      <Component />
    </Route>
  );
}

function Router() {
  const { user } = useAuth();
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to={user ? "/characters" : "/login"} />} />
      <Route path="/login" component={Login} />
      <ProtectedRoute path="/characters" component={Characters} />
      <ProtectedRoute path="/characters/:id" component={CharacterSheet} />
      <ProtectedRoute path="/compendium" component={Compendium} />
      <ProtectedRoute path="/weavekeeper" component={Weavekeeper} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <DiceRollerProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
              <RollLog />
            </WouterRouter>
          </DiceRollerProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
