import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/characters" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-[family-name:'Cinzel',serif] font-bold sm:inline-block text-primary">
              THREADCAST
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/characters"
              className={`transition-colors hover:text-foreground/80 ${
                location.startsWith("/characters") ? "text-foreground" : "text-foreground/60"
              }`}
            >
              Characters
            </Link>
            <Link
              href="/compendium"
              className={`transition-colors hover:text-foreground/80 ${
                location.startsWith("/compendium") ? "text-foreground" : "text-foreground/60"
              }`}
            >
              Compendium
            </Link>
            {user?.role === "weavekeeper" && (
              <Link
                href="/weavekeeper"
                className={`transition-colors hover:text-foreground/80 ${
                  location.startsWith("/weavekeeper") ? "text-foreground" : "text-foreground/60"
                }`}
              >
                Weavekeeper
              </Link>
            )}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
          </div>
          <nav className="flex items-center space-x-2">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{user.displayName}</span>
                <Button variant="ghost" onClick={() => logout()} data-testid="button-logout">
                  Logout
                </Button>
              </div>
            ) : null}
          </nav>
        </div>
      </div>
    </header>
  );
}
