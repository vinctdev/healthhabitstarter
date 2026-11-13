/**
 * Tab registry: the single place that decides which areas the app has.
 *
 * Desktop and mobile navigation, the mobile "More" sheet and both shells are built from this
 * list. To remove an area, delete its entry. To add one, create a view component and add an
 * entry. The first entry is the start tab. See docs/customizing.md.
 */
import type { ComponentType } from "react";
import type { IconType } from "react-icons";
import {
  LuActivity,
  LuApple,
  LuHouse,
  LuPill,
  LuSparkles,
  LuTrendingUp,
  LuUser,
} from "react-icons/lu";
import MainView from "./components/MainView";
import FoodView from "./components/FoodView";
import SportView from "./components/SportView";
import SupplementsView from "./components/SupplementsView";
import PerformanceView from "./components/PerformanceView";
import BodyView from "./components/BodyView";
import AIView from "./components/AIView";
import MobileMainView from "./mobile/MobileMainView";
import MobileFoodView from "./mobile/MobileFoodView";

export interface Feature {
  /** Stable id, also used as `data-tab` attribute (screenshot script, tests). */
  id: string;
  /** Full name, e.g. in the mobile "More" sheet. */
  label: string;
  /** Short name for the navigation bars. */
  navLabel: string;
  icon: IconType;
  view: ComponentType;
  /** Optional replacement view for phones (< 640 px). */
  mobileView?: ComponentType;
  /** Phones: "bar" = bottom bar (max. 4 fit), "more" = "More" sheet with `description`. */
  mobile: "bar" | "more";
  description?: string;
  /** Keep the view mounted after the first visit (e.g. to preserve a chat). */
  keepMounted?: boolean;
}

export const FEATURES: Feature[] = [
  {
    id: "main",
    label: "Main",
    navLabel: "Main",
    icon: LuHouse,
    view: MainView,
    mobileView: MobileMainView,
    mobile: "bar",
  },
  {
    id: "food",
    label: "Food",
    navLabel: "Food",
    icon: LuApple,
    view: FoodView,
    mobileView: MobileFoodView,
    mobile: "bar",
  },
  {
    id: "sport",
    label: "Sport",
    navLabel: "Sport",
    icon: LuActivity,
    view: SportView,
    mobile: "bar",
  },
  {
    id: "supplements",
    label: "Supplements",
    navLabel: "Suppl.",
    icon: LuPill,
    view: SupplementsView,
    mobile: "bar",
  },
  {
    id: "performance",
    label: "Performance",
    navLabel: "Perf.",
    icon: LuTrendingUp,
    view: PerformanceView,
    mobile: "more",
    description: "Energy, sleep and readiness",
  },
  {
    id: "body",
    label: "Body",
    navLabel: "Body",
    icon: LuUser,
    view: BodyView,
    mobile: "more",
    description: "Profile, measurements and BMI",
  },
  {
    id: "ai",
    label: "AI mentor",
    navLabel: "AI",
    icon: LuSparkles,
    view: AIView,
    mobile: "more",
    description: "Questions about your data",
    keepMounted: true,
  },
];

export type TabId = string;

export const START_TAB: TabId = FEATURES[0].id;
