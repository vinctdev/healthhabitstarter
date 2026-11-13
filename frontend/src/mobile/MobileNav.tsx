import { LuEllipsis } from "react-icons/lu";
import type { TabId } from "../features";
import { MORE_TAB_IDS, MORE_TABS, PRIMARY_TABS } from "./mobileTabs";

interface MobileNavProps {
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
  onOpenMore: () => void;
  moreOpen: boolean;
}

export default function MobileNav({ activeTab, onSelect, onOpenMore, moreOpen }: MobileNavProps) {
  const moreActive = moreOpen || MORE_TAB_IDS.has(activeTab);

  return (
    <nav className="mobile-nav" aria-label="Main navigation">
      <div className="mobile-nav-inner">
        {PRIMARY_TABS.map((tab) => {
          const isActive = activeTab === tab.id && !moreOpen;
          return (
            <button
              key={tab.id}
              type="button"
              data-tab={tab.id}
              onClick={() => onSelect(tab.id)}
              className="mobile-nav-item"
              data-active={isActive ? "true" : "false"}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
            >
              <span className="mobile-nav-indicator" aria-hidden="true" />
              <tab.icon className="mobile-nav-icon" aria-hidden="true" />
              <span className="mobile-nav-label">{tab.navLabel}</span>
            </button>
          );
        })}

        {MORE_TABS.length > 0 && (
          <button
            type="button"
            data-tab="more"
            onClick={onOpenMore}
            className="mobile-nav-item"
            data-active={moreActive ? "true" : "false"}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
          >
            <span className="mobile-nav-indicator" aria-hidden="true" />
            <span className="relative">
              <LuEllipsis className="mobile-nav-icon" aria-hidden="true" />
              {moreActive && !moreOpen ? (
                <span className="mobile-nav-dot" aria-hidden="true" />
              ) : null}
            </span>
            <span className="mobile-nav-label">More</span>
          </button>
        )}
      </div>
    </nav>
  );
}
