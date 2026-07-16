import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Home, Car, Inbox, ShoppingCart, Tag } from "lucide-react";
import { AutoAceLogo } from "@/components/AutoAceLogo";

const links = [
  { to: "/welcome", label: "Home", icon: Home },
  { to: "/marketplace", label: "Browse Vehicles", icon: Car },
  { to: "/requests", label: "Buyer Requests", icon: Inbox },
  { to: "/buy", label: "Buy a Car", icon: ShoppingCart },
  { to: "/sell", label: "Sell a Car", icon: Tag },
] as const;

const HIDDEN_PREFIXES = ["/", "/auth", "/admin"];

export function PublicNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const hidden =
    pathname === "/" || HIDDEN_PREFIXES.some((p) => p !== "/" && pathname.startsWith(p));
  if (hidden) return null;

  return (
    <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link to="/welcome" className="flex items-center shrink-0">
          <AutoAceLogo className="text-lg" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active =
              l.to === "/welcome" ? pathname === "/welcome" : pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-2 text-sm font-medium rounded-full transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/80 hover:bg-muted"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="md:hidden press h-10 w-10 rounded-full border border-border flex items-center justify-center"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background animate-fade-up">
          <nav className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1">
            {links.map((l) => {
              const Icon = l.icon;
              const active =
                l.to === "/welcome" ? pathname === "/welcome" : pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/90 hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
