import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth/auth-context";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { BookOpen, Scroll, ShieldHalf, LogOut, Swords, Sun, Moon, Dices } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const initials = user?.displayName
    ? user.displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex items-center">
          <Link href="/characters" className="mr-6 flex items-center gap-2 group">
            <div className="relative">
              <Swords className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
            </div>
            <span className="font-[family-name:'Cinzel',serif] font-bold sm:inline-block text-primary tracking-wider text-sm group-hover:text-primary/90 transition-colors">
              THREADCAST
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link href="/characters">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-all duration-150 font-mono text-xs tracking-wide",
                location.startsWith("/characters")
                  ? "text-foreground bg-primary/10 border border-primary/20"
                  : "text-foreground/50 hover:text-foreground hover:bg-muted/50"
              )}>
                <Scroll className="w-3.5 h-3.5" />
                <span>Characters</span>
              </div>
            </Link>
            <Link href="/compendium">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-all duration-150 font-mono text-xs tracking-wide",
                location.startsWith("/compendium")
                  ? "text-foreground bg-primary/10 border border-primary/20"
                  : "text-foreground/50 hover:text-foreground hover:bg-muted/50"
              )}>
                <BookOpen className="w-3.5 h-3.5" />
                <span>Compendium</span>
              </div>
            </Link>
            <Link href="/dice">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-all duration-150 font-mono text-xs tracking-wide",
                location.startsWith("/dice")
                  ? "text-foreground bg-primary/10 border border-primary/20"
                  : "text-foreground/50 hover:text-foreground hover:bg-muted/50"
              )}>
                <Dices className="w-3.5 h-3.5" />
                <span>Dice Atelier</span>
              </div>
            </Link>
            {user?.role === "weavekeeper" && (
              <Link href="/weavekeeper">
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-all duration-150 font-mono text-xs tracking-wide",
                  location.startsWith("/weavekeeper")
                    ? "text-primary bg-primary/10 border border-primary/20"
                    : "text-primary/50 hover:text-primary hover:bg-primary/5"
                )}>
                  <ShieldHalf className="w-3.5 h-3.5" />
                  <span>Weavekeeper</span>
                </div>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <Link href="/characters" className="md:hidden font-[family-name:'Cinzel',serif] text-primary tracking-wide text-sm font-bold">
            THREADCAST
          </Link>
          <div className="w-full flex-1 md:w-auto md:flex-none" />
          <nav className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center border border-border/40 text-muted-foreground/60 hover:text-foreground hover:border-border/80 transition-all"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-primary font-bold">{initials}</span>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground hidden sm:block">{user.displayName}</span>
                  {user.role === "weavekeeper" && (
                    <span className="text-[9px] font-mono text-primary/60 border border-primary/20 px-1 py-0.5 hidden sm:block">WK</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  className="text-muted-foreground/60 hover:text-foreground font-mono text-xs gap-1.5 h-8"
                  data-testid="button-logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:block">Logout</span>
                </Button>
              </div>
            ) : null}
          </nav>
        </div>
      </div>
      {user && (
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto border-t border-border/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide" aria-label="Main navigation">
          {[
            { href: "/characters", name: "Characters", icon: Scroll },
            { href: "/compendium", name: "Compendium", icon: BookOpen },
            { href: "/dice", name: "Dice Atelier", icon: Dices },
            ...(user.role === "weavekeeper" ? [{ href: "/weavekeeper", name: "Weavekeeper", icon: ShieldHalf }] : []),
          ].map(({ href, name, icon: Icon }) => (
            <Link key={href} href={href} data-testid={`link-mobile-${href.slice(1)}`}
              className={cn("flex shrink-0 items-center gap-1 px-2 py-1.5", location.startsWith(href) ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="w-3.5 h-3.5" />{name}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
