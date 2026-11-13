/**
 * Run locations in display order; the first one is the form default. Indoor
 * locations hide the temperature field. Stored as plain strings, so unknown
 * values from older runs still display (with the fallback icon).
 */
export const RUN_LOCATIONS: { value: string; icon: string; indoor?: boolean }[] = [
  { value: "Forest", icon: "\u{1F332}" },
  { value: "Fields", icon: "\u{1F33E}" },
  { value: "Park", icon: "\u{1F333}" },
  { value: "Town", icon: "\u{1F3E1}" },
  { value: "Trail", icon: "⛰️" },
  { value: "Track", icon: "\u{1F3DF}️" },
  { value: "Treadmill", icon: "\u{1F3C3}", indoor: true },
];

const FALLBACK_ICON = "\u{1F3C3}";

export function runLocationIcon(value: string): string {
  return RUN_LOCATIONS.find((loc) => loc.value === value)?.icon ?? FALLBACK_ICON;
}

export function isIndoorLocation(value: string): boolean {
  return RUN_LOCATIONS.find((loc) => loc.value === value)?.indoor ?? false;
}
