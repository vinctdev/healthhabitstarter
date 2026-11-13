import { FEATURES } from "../features";

/** Tabs shown in the mobile bottom bar (see `mobile: "bar"` in features.ts). */
export const PRIMARY_TABS = FEATURES.filter((tab) => tab.mobile === "bar");

/** Tabs reachable through the "More" sheet. */
export const MORE_TABS = FEATURES.filter((tab) => tab.mobile === "more");

export const MORE_TAB_IDS = new Set(MORE_TABS.map((tab) => tab.id));
