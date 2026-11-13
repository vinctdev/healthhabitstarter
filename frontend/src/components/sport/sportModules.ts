/**
 * Sport module registry: each entry is one activity with its own view (and usually its own
 * backend router). The Sport tab builds its switcher from this list and hides the switcher when
 * only one module is left. To remove an activity, delete its entry; to add one, see
 * docs/customizing.md ("Adding a sport").
 */
import type { ComponentType } from "react";
import type { IconType } from "react-icons";
import { LuDumbbell, LuFootprints } from "react-icons/lu";
import RunningModule from "./RunningModule";
import PushupModule from "./PushupModule";

export interface SportModule {
  id: string;
  label: string;
  icon: IconType;
  view: ComponentType;
}

export const SPORT_MODULES: SportModule[] = [
  { id: "running", label: "Running", icon: LuFootprints, view: RunningModule },
  { id: "pushups", label: "Push-ups", icon: LuDumbbell, view: PushupModule },
];
