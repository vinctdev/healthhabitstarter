import { useEffect, useState } from "react";
import { FEATURES, type TabId } from "../features";

interface TabViewsProps {
  activeTab: TabId;
  mobile?: boolean;
}

/** Renders the active tab from the registry; `keepMounted` tabs stay mounted (hidden) once visited. */
export default function TabViews({ activeTab, mobile = false }: TabViewsProps) {
  const [visited, setVisited] = useState<Set<TabId>>(() => new Set([activeTab]));

  useEffect(() => {
    setVisited((prev) => (prev.has(activeTab) ? prev : new Set(prev).add(activeTab)));
  }, [activeTab]);

  return (
    <>
      {FEATURES.map((feature) => {
        const isActive = feature.id === activeTab;
        const View = (mobile && feature.mobileView) || feature.view;
        if (feature.keepMounted) {
          if (!isActive && !visited.has(feature.id)) return null;
          return (
            <div key={feature.id} className={isActive ? "" : "hidden"}>
              <View />
            </div>
          );
        }
        return isActive ? <View key={feature.id} /> : null;
      })}
    </>
  );
}
