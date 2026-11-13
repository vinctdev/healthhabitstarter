import { useLayoutEffect, useState } from "react";
import DashboardLayout from "./DashboardLayout";
import MobileDashboard from "../mobile/MobileDashboard";
import useMediaQuery from "../mobile/useMediaQuery";
import { START_TAB, type TabId } from "../features";

/**
 * Switches between the mobile shell (< 640 px) and the desktop shell.
 *
 * Desktop renders DashboardLayout unchanged. The mobile CSS is
 * additionally scoped via data-mobile="on". The active tab lives here, so it
 * survives a switch between the shells (resizing across 640 px).
 */
export default function AppShell() {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [activeTab, setActiveTab] = useState<TabId>(START_TAB);

  useLayoutEffect(() => {
    if (!isMobile) {
      delete document.documentElement.dataset.mobile;
      return;
    }

    document.documentElement.dataset.mobile = "on";
    return () => {
      delete document.documentElement.dataset.mobile;
    };
  }, [isMobile]);

  if (isMobile) return <MobileDashboard activeTab={activeTab} onTabChange={setActiveTab} />;

  return <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} />;
}
