import { Outlet, useLocation } from "react-router";
import { PhoneFrame } from "./components/PhoneFrame";
import { TabNav } from "./components/TabNav";

/** Welcome, the voice induction and the lesson player are immersive — no tab bar. */
const ROUTES_WITHOUT_NAV = new Set(["/", "/induction"]);
const LESSON_ROUTE = /^\/learn\/./;

export function AppLayout() {
  const { pathname } = useLocation();
  const showNav = !ROUTES_WITHOUT_NAV.has(pathname) && !LESSON_ROUTE.test(pathname);

  return (
    <PhoneFrame footer={showNav ? <TabNav /> : undefined}>
      <Outlet />
    </PhoneFrame>
  );
}
