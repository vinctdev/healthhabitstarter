import BottomNav from "./BottomNav";
import TabViews from "./TabViews";
import type { TabId } from "../features";

interface DashboardLayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

/** Desktop shell. Tabs come from the registry in features.ts. */
export default function DashboardLayout({ activeTab, onTabChange }: DashboardLayoutProps) {
  return (
    <>
      <div className="relative z-10 mx-auto max-w-dash px-4 pb-24 pt-4 safe-area-top sm:px-6 md:px-8">
        <TabViews activeTab={activeTab} />
      </div>
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </>
  );
}
