import { CalendarDays, CircleUserRound, GraduationCap, House, MapPin, Users } from "lucide-react";
import { NavLink } from "react-router";

const TABS = [
  { to: "/home", label: "Home", Icon: House },
  { to: "/learn", label: "Learn", Icon: GraduationCap },
  { to: "/calendar", label: "Calendar", Icon: CalendarDays },
  { to: "/map", label: "Map", Icon: MapPin },
  { to: "/events", label: "Events", Icon: Users },
  { to: "/profile", label: "Profile", Icon: CircleUserRound },
] as const;

/** Bottom tab bar. Every target is at least 44px tall and labelled in words. */
export function TabNav() {
  return (
    <nav
      aria-label="Main"
      className="shrink-0 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="grid grid-cols-6">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                [
                  "flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-semibold transition-colors",
                  isActive ? "text-brand-700" : "text-ink-faint hover:text-ink-soft",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={23} strokeWidth={isActive ? 2.4 : 1.9} aria-hidden />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
