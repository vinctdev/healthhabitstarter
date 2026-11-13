import { useState } from "react";
import { LuX, LuSave } from "react-icons/lu";
import { useCreateFoodTemplate } from "../hooks/useFood";
import type { FoodEntry } from "../types";
import { hasNegative } from "../utils/number";

interface SaveTemplateModalProps {
  entry: FoodEntry;
  open: boolean;
  onClose: () => void;
}

export default function SaveTemplateModal({ entry, open, onClose }: SaveTemplateModalProps) {
  const [label, setLabel] = useState(entry.name);
  const [unit, setUnit] = useState(entry.unit || "g");
  const [gramsPerPiece, setGramsPerPiece] = useState(
    entry.unit === "pcs" && entry.grams_total && entry.amount
      ? String(Math.round((entry.grams_total / entry.amount) * 10) / 10)
      : entry.grams_total
        ? String(entry.grams_total)
        : "",
  );
  const createTemplate = useCreateFoodTemplate();

  if (!open) return null;

  const normalize = (value: number, originalAmount: number, targetAmount: number): number => {
    if (!originalAmount || originalAmount === 0) return value;
    return value * (targetAmount / originalAmount);
  };

  const massUnit = unit === "g" || unit === "ml";
  const sourceIsPiece = entry.unit === "pcs";
  const pieceMass = entry.grams_total != null && entry.grams_total > 0 ? entry.grams_total : null;
  const hasPieceMass = !sourceIsPiece || pieceMass != null;
  const gramsPerPieceNum = parseFloat(gramsPerPiece) || 0;

  const originalAmount = sourceIsPiece && massUnit && pieceMass ? pieceMass : entry.amount || 1;
  const targetAmount = unit === "pcs" ? 1 : 100;
  const normalizeTarget =
    unit !== "pcs" ? 100 : sourceIsPiece ? 1 : gramsPerPieceNum || originalAmount;

  const normalizedCalories = Math.round(normalize(entry.calories, originalAmount, normalizeTarget));
  const normalizedProtein = normalize(entry.protein, originalAmount, normalizeTarget);
  const normalizedCarbs = normalize(entry.carbs, originalAmount, normalizeTarget);
  const normalizedFat = normalize(entry.fat, originalAmount, normalizeTarget);
  const normalizedSalt = normalize(entry.salt, originalAmount, normalizeTarget);
  const normalizedSugar = normalize(entry.sugar, originalAmount, normalizeTarget);
  const normalizedWater = Math.round(normalize(entry.water_ml, originalAmount, normalizeTarget));
  const normalizedFiber =
    entry.fiber == null ? null : normalize(entry.fiber, originalAmount, normalizeTarget);
  const normalizedSaturatedFat =
    entry.saturated_fat == null
      ? null
      : normalize(entry.saturated_fat, originalAmount, normalizeTarget);

  const handleSave = () => {
    if (massUnit && !hasPieceMass) return;
    createTemplate.mutate({
      label: label.trim() || entry.name,
      name: entry.name,
      emoji: entry.emoji,
      is_drink: entry.is_drink,
      amount: targetAmount,
      unit,
      grams_per_piece: unit === "pcs" && gramsPerPiece ? parseFloat(gramsPerPiece) : null,
      calories: normalizedCalories,
      protein: Math.round(normalizedProtein * 10) / 10,
      carbs: Math.round(normalizedCarbs * 10) / 10,
      fat: Math.round(normalizedFat * 10) / 10,
      salt: Math.round(normalizedSalt * 100) / 100,
      sugar: Math.round(normalizedSugar * 10) / 10,
      water_ml: normalizedWater,
      fiber: normalizedFiber == null ? null : Math.round(normalizedFiber * 10) / 10,
      saturated_fat:
        normalizedSaturatedFat == null ? null : Math.round(normalizedSaturatedFat * 10) / 10,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0C0C0D] p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[14px] font-bold text-dash-primary">
            Save as template
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-dash-tertiary hover:text-dash-secondary"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">
              Template name
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
              placeholder="e.g. My porridge"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-dash-secondary">
            <span>{entry.emoji}</span>
            <span className="font-mono text-[12px]">{entry.name}</span>
          </div>

          <div>
            <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">
              Unit{" "}
              {unit === "pcs"
                ? sourceIsPiece
                  ? "(values per piece)"
                  : "(values per piece, scaled via grams per piece)"
                : "(normalized to 100 " + unit + ")"}
            </label>
            <div className="flex gap-2">
              {(["g", "ml", "pcs"] as const).map((u) => {
                const disabled = u !== "pcs" && !hasPieceMass;
                return (
                  <button
                    key={u}
                    disabled={disabled}
                    title={disabled ? "No gram amount available, cannot convert" : undefined}
                    onClick={() => {
                      setUnit(u);
                      if (u === "pcs" && !sourceIsPiece && !gramsPerPiece && entry.amount) {
                        setGramsPerPiece(String(entry.amount));
                      }
                    }}
                    className={`flex-1 rounded-lg px-3 py-2 font-mono text-[11px] font-bold transition-colors ${
                      unit === u
                        ? "bg-dash-success text-black"
                        : disabled
                          ? "cursor-not-allowed bg-white/[0.03] text-dash-tertiary/50"
                          : "bg-white/[0.06] text-dash-secondary hover:bg-white/[0.1]"
                    }`}
                  >
                    {u}
                  </button>
                );
              })}
            </div>
          </div>

          {unit === "pcs" && (
            <div>
              <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">
                {entry.is_drink ? "ml" : "Grams"} per piece
              </label>
              <input
                value={gramsPerPiece}
                onChange={(e) => setGramsPerPiece(e.target.value)}
                className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
                placeholder="e.g. 150"
              />
            </div>
          )}

          <div className="rounded-lg bg-white/[0.04] p-3">
            <span className="block mb-2 font-mono text-[10px] font-bold text-dash-tertiary">
              {unit === "pcs"
                ? `Nutrition from entry (${targetAmount} ${unit})`
                : `Normalized nutrition per ${targetAmount} ${unit}`}
              {entry.amount && (entry.amount !== targetAmount || entry.unit !== unit) && (
                <span className="ml-1 font-normal text-[#FF6B6B]">
                  (Original: {entry.amount} {entry.unit || "g"}
                  {entry.unit === "pcs" && entry.grams_total
                    ? ` (${entry.grams_total}${entry.is_drink ? "ml" : "g"})`
                    : ""}
                  )
                </span>
              )}
            </span>
            <div className="grid grid-cols-2 gap-1 font-mono text-[10px] text-dash-secondary sm:grid-cols-3">
              <span>{normalizedCalories} kcal</span>
              <span>Protein: {normalizedProtein.toFixed(1)}g</span>
              <span>Carbs: {normalizedCarbs.toFixed(1)}g</span>
              <span>Fat: {normalizedFat.toFixed(1)}g</span>
              <span>Salt: {normalizedSalt.toFixed(2)}g</span>
              <span>Sugar: {normalizedSugar.toFixed(1)}g</span>
              <span>Water: {normalizedWater}ml</span>
              <span>Fiber: {normalizedFiber != null ? `${normalizedFiber.toFixed(1)}g` : "-"}</span>
              <span>
                Saturated fat:{" "}
                {normalizedSaturatedFat != null ? `${normalizedSaturatedFat.toFixed(1)}g` : "-"}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 font-mono text-[11px] font-bold text-dash-primary transition-all hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                createTemplate.isPending ||
                (massUnit && !hasPieceMass) ||
                hasNegative(gramsPerPiece)
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-dash-success px-5 py-2 font-mono text-[11px] font-bold text-black transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              <LuSave className="h-3 w-3" />
              {createTemplate.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
