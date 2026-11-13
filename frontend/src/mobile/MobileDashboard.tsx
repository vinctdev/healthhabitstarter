import { useCallback, useEffect, useState } from "react";
import SettingsModal from "../components/SettingsModal";
import TabViews from "../components/TabViews";
import type { TabId } from "../features";
import MobileNav from "./MobileNav";
import MoreSheet from "./MoreSheet";
import "./mobile.css";

/**
 * Mobile shell of the dashboard.
 *
 * Rendered by AppShell only below 640 px; desktop keeps using
 * the regular shell (DashboardLayout). Tabs come from features.ts.
 */
interface MobileDashboardProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function MobileDashboard({ activeTab, onTabChange }: MobileDashboardProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const closeMore = useCallback(() => setMoreOpen(false), []);

  const handleSelectTab = useCallback(
    (tab: TabId) => {
      onTabChange(tab);
      setMoreOpen(false);
    },
    [onTabChange],
  );

  return (
    <>
      <div className="mobile-content relative z-10 mx-auto w-full max-w-dash" data-view={activeTab}>
        <TabViews activeTab={activeTab} mobile />
      </div>

      <MobileNav
        activeTab={activeTab}
        onSelect={handleSelectTab}
        onOpenMore={() => setMoreOpen(true)}
        moreOpen={moreOpen}
      />

      <MoreSheet
        open={moreOpen}
        activeTab={activeTab}
        onClose={closeMore}
        onSelect={handleSelectTab}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
