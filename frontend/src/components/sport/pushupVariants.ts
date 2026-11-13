import type { PushupVariant } from "../../types";

/**
 * Push-up variants in display order. The hand position shifts the focus, no
 * equipment needed. Keep in sync with VARIANTS in backend/app/schemas/pushups.py.
 */
export const PUSHUP_VARIANTS: {
  key: PushupVariant;
  label: string;
  focus: string;
  color: string;
}[] = [
  { key: "standard", label: "Standard", focus: "Full upper body", color: "#5FC4D9" },
  { key: "wide", label: "Wide", focus: "Chest focus", color: "#6BE3A4" },
  { key: "close", label: "Close-grip", focus: "Triceps focus · diamond", color: "#6878C0" },
  { key: "pike", label: "Pike", focus: "Shoulder focus · hips up", color: "#F2C063" },
];
