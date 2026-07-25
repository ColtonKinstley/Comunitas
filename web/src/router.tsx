import { createBrowserRouter } from "react-router";
import { AppLayout } from "./AppLayout";
import Calendar from "./pages/Calendar";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import History from "./pages/History";
import Home from "./pages/Home";
import Induction from "./pages/Induction";
import MapPage from "./pages/MapPage";
import Pod from "./pages/Pod";
import Profile from "./pages/Profile";
import Welcome from "./pages/Welcome";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true, Component: Welcome },
      { path: "induction", Component: Induction },
      { path: "home", Component: Home },
      { path: "profile", Component: Profile },
      { path: "pod", Component: Pod },
      { path: "calendar", Component: Calendar },
      { path: "map", Component: MapPage },
      { path: "events", Component: Events },
      { path: "events/:id", Component: EventDetail },
      { path: "history", Component: History },
    ],
  },
]);
