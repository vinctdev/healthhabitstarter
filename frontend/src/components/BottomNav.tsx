import { FEATURES, type TabId } from "../features";

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-dash px-4 sm:px-6 md:px-8">
        <nav className="flex items-center justify-center gap-4 rounded-t-2xl border-t border-white/[0.06] bg-[#0C0C0D] px-6 py-1 shadow-[0_-4px_24px_rgba(0,0,0,0.6)] sm:gap-6">
          {FEATURES.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center gap-1 px-2 py-3 transition-colors sm:px-4 ${
                  isActive ? "text-dash-success" : "text-dash-tertiary hover:text-dash-secondary"
                }`}
              >
                {isActive && (
                  <span className="absolute -top-[1px] left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-dash-success shadow-[0_0_6px_rgba(107,227,164,0.5)]" />
                )}
                <tab.icon className="h-5 w-5" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
                  {tab.navLabel}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
