import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth/auth-context";
import { useTheme } from "@/contexts/ThemeContext";
import { BookOpen, Scroll, ShieldHalf, LogOut, Compass, Sun, Moon, Dices } from "lucide-react";
import "@/styles/journal-entry.css";

export default function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const initials = user?.displayName ? user.displayName.split(" ").map(word => word[0]).join("").slice(0, 2).toUpperCase() : "?";
  const links = [
    { href: "/characters", name: "Characters", icon: Scroll },
    { href: "/compendium", name: "Compendium", icon: BookOpen },
    { href: "/dice", name: "Dice Atelier", icon: Dices },
    ...(user?.role === "weavekeeper" ? [{ href: "/weavekeeper", name: "Weavekeeper", icon: ShieldHalf }] : []),
  ];
  const isActive = (href: string) => location.startsWith(href) || (href === "/characters" && location.startsWith("/build"));
  return (
    <header className="ae-navbar">
      <div className="ae-navbar-inner">
        <Link href="/characters" className="ae-brand" aria-label="THREADCAST character roster"><span className="ae-brand-seal"><Compass size={25} strokeWidth={1.2} aria-hidden="true" /></span><span>THREADCAST<small>WORLD OF AETHROS</small></span></Link>
        <nav className="ae-desktop-navigation" aria-label="Main navigation">{links.map(({ href, name, icon: Icon }) => <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}><Icon size={15} aria-hidden="true" /><span>{name}</span></Link>)}</nav>
        <div className="ae-account-controls">
          <button type="button" onClick={toggleTheme} className="ae-icon-button" title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"} aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
          {user && <><div className="ae-account"><span className="ae-account-initials" aria-hidden="true">{initials}</span><span className="ae-account-name">{user.displayName}<small>{user.role === "weavekeeper" ? "Weavekeeper" : "Adventurer"}</small></span></div><button type="button" onClick={() => logout()} className="ae-icon-button" data-testid="button-logout" title="Logout" aria-label="Logout"><LogOut size={16} /></button></>}
        </div>
      </div>
      {user && <nav className="ae-mobile-navigation" aria-label="Main navigation">{links.map(({ href, name, icon: Icon }) => <Link key={href} href={href} data-testid={`link-mobile-${href.slice(1)}`} aria-current={isActive(href) ? "page" : undefined}><Icon size={16} aria-hidden="true" /><span>{name}</span></Link>)}</nav>}
    </header>
  );
}
