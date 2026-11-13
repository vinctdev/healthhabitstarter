import { useEffect } from "react";
import { LuSettings, LuX } from "react-icons/lu";
import type { TabId } from "../features";
import { MORE_TABS } from "./mobileTabs";

interface MoreSheetProps {
  open: boolean;
  activeTab: TabId;
  onClose: () => void;
  onSelect: (tab: TabId) => void;
  onOpenSettings: () => void;
}

export default function MoreSheet({
  open,
  activeTab,
  onClose,
  onSelect,
  onOpenSettings,
}: MoreSheetProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div
      className={`more-sheet-root${open ? " is-open" : ""}`}
      aria-hidden={open ? undefined : "true"}
    >
      <button
        type="button"
        className="more-sheet-backdrop"
        onClick={onClose}
        aria-label="Close more menu"
        tabIndex={open ? 0 : -1}
      />

      <div className="more-sheet" role="dialog" aria-modal="true" aria-label="More sections">
        <div className="more-sheet-handle" aria-hidden="true" />

        <div className="more-sheet-head">
          <div>
            <p className="more-sheet-eyebrow">Navigation</p>
            <h2 className="more-sheet-title">More</h2>
          </div>
          <button type="button" className="mobile-icon-button" onClick={onClose} aria-label="Close">
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <div className="more-sheet-list">
          {MORE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-tab={tab.id}
              onClick={() => onSelect(tab.id)}
              className="more-sheet-item"
              data-active={activeTab === tab.id ? "true" : "false"}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              <span className="more-sheet-item-icon">
                <tab.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="more-sheet-item-text">
                <span className="more-sheet-item-label">{tab.label}</span>
                {tab.description ? (
                  <span className="more-sheet-item-description">{tab.description}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>

        <div className="more-sheet-divider" />

        <button
          type="button"
          className="more-sheet-settings"
          onClick={() => {
            onClose();
            onOpenSettings();
          }}
        >
          <LuSettings className="h-4 w-4" aria-hidden="true" />
          Day settings
        </button>
      </div>
    </div>
  );
}
