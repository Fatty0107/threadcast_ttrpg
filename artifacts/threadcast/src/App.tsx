import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { DiceRollerProvider } from "@/components/shared/DiceRoller";
import { RollLog } from "@/components/shared/RollLog";
import { HomebrewProvider } from "@/contexts/HomebrewContext";
import Login from "@/pages/Login";
import Characters from "@/pages/Characters";
import CharacterSheet from "@/pages/CharacterSheet";
import CharacterBuilder from "@/pages/CharacterBuilder";
import Compendium from "@/pages/Compendium";
import Weavekeeper from "@/pages/Weavekeeper";
import Navbar from "@/components/layout/Navbar";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ component: Component, path, componentProps }: {
  component: React.ComponentType<any>;
  path: string;
  componentProps?: Record<string, unknown>;
}) {
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

  if (!user) {
    return <Route path={path}><Redirect to="/login" /></Route>;
  }

  return (
    <Route path={path}>
      <Navbar />
      <Component {...(componentProps || {})} />
    </Route>
  );
}

function CharacterBuilderEditPage({ id }: { id: string }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground font-mono">LOADING...</div>;
  if (!user) return <Redirect to="/login" />;
  return (
    <>
      <Navbar />
      <CharacterBuilder charId={id} />
    </>
  );
}

function Router() {
  const { user } = useAuth();
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to={user ? "/characters" : "/login"} />} />
      <Route path="/login" component={Login} />
      <ProtectedRoute path="/characters" component={Characters} />
      <ProtectedRoute path="/build" component={CharacterBuilder} />
      <Route path="/characters/:id/build">
        {(params) => <CharacterBuilderEditPage id={params!.id} />}
      </Route>
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
          <HomebrewProvider>
            <DiceRollerProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
                <RollLog />
              </WouterRouter>
            </DiceRollerProvider>
          </HomebrewProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
