import { Outlet, useLocation } from "react-router";
import { PhoneFrame } from "./components/PhoneFrame";
import { TabNav } from "./components/TabNav";

/** Welcome and the voice induction are immersive — no tab bar. */
const ROUTES_WITHOUT_NAV = new Set(["/", "/induction"]);

export function AppLayout() {
  const { pathname } = useLocation();
  const showNav = !ROUTES_WITHOUT_NAV.has(pathname);

  return (
    <PhoneFrame footer={showNav ? <TabNav /> : undefined}>
      <Outlet />
    </PhoneFrame>
  );
}
