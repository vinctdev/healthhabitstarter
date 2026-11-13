import { useState } from "react";
import { LuPencil, LuTrash2, LuCheck, LuX, LuSave } from "react-icons/lu";
import { useUpdateFoodEntry, useDeleteFoodEntry } from "../hooks/useFood";
import type { FoodEntry } from "../types";
import { hasNegative } from "../utils/number";

interface FoodEntryRowProps {
  entry: FoodEntry;
  onSaveTemplate?: (entry: FoodEntry) => void;
}

export default function FoodEntryRow({ entry, onSaveTemplate }: FoodEntryRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(entry.name);
  const [editAmount, setEditAmount] = useState(entry.amount ? String(entry.amount) : "");
  const [editCalories, setEditCalories] = useState(String(entry.calories));
  const [editProtein, setEditProtein] = useState(String(entry.protein));
  const [editCarbs, setEditCarbs] = useState(String(entry.carbs));
  const [editFat, setEditFat] = useState(String(entry.fat));
  const [editSalt, setEditSalt] = useState(String(entry.salt));
  const [editSugar, setEditSugar] = useState(String(entry.sugar));
  const [editWater, setEditWater] = useState(String(entry.water_ml));
  const [editFiber, setEditFiber] = useState(entry.fiber != null ? String(entry.fiber) : "");
  const [editSaturatedFat, setEditSaturatedFat] = useState(
    entry.saturated_fat != null ? String(entry.saturated_fat) : "",
  );
  const [editTime, setEditTime] = useState(entry.time);

  const parseOptional = (value: string): number | null => {
    if (value.trim() === "") return null;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const [editGramsTotal, setEditGramsTotal] = useState(
    entry.grams_total ? String(entry.grams_total) : "",
  );

  const updateEntry = useUpdateFoodEntry();
  const deleteEntry = useDeleteFoodEntry();

  const handleSave = () => {
    updateEntry.mutate({
      id: entry.id,
      name: editName,
      amount: editAmount ? parseFloat(editAmount) : null,
      grams_total: editGramsTotal ? parseFloat(editGramsTotal) : null,
      calories: parseInt(editCalories) || 0,
      protein: parseFloat(editProtein) || 0,
      carbs: parseFloat(editCarbs) || 0,
      fat: parseFloat(editFat) || 0,
      salt: parseFloat(editSalt) || 0,
      sugar: parseFloat(editSugar) || 0,
      water_ml: parseInt(editWater) || 0,
      fiber: parseOptional(editFiber),
      saturated_fat: parseOptional(editSaturatedFat),
      time: editTime,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditName(entry.name);
    setEditAmount(entry.amount ? String(entry.amount) : "");
    setEditGramsTotal(entry.grams_total ? String(entry.grams_total) : "");
    setEditCalories(String(entry.calories));
    setEditProtein(String(entry.protein));
    setEditCarbs(String(entry.carbs));
    setEditFat(String(entry.fat));
    setEditSalt(String(entry.salt));
    setEditSugar(String(entry.sugar));
    setEditWater(String(entry.water_ml));
    setEditFiber(entry.fiber != null ? String(entry.fiber) : "");
    setEditSaturatedFat(entry.saturated_fat != null ? String(entry.saturated_fat) : "");
    setEditTime(entry.time);
    setEditing(false);
  };

  const handleDelete = () => {
    if (confirm("Delete this entry?")) {
      deleteEntry.mutate(entry.id);
    }
  };

  if (editing) {
    return (
      <div className="rounded-lg bg-white/[0.06] px-3 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{entry.emoji}</span>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 rounded bg-white/[0.08] px-2 py-1 font-mono text-sm text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
          />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[9px] text-dash-tertiary w-10">Time</span>
          <input
            type="time"
            value={editTime}
            onChange={(e) => setEditTime(e.target.value)}
            className="rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
          />
        </div>
        <div className={`grid gap-2 mb-2 ${entry.unit === "pcs" ? "grid-cols-4" : "grid-cols-3"}`}>
          <div>
            <span className="font-mono text-[9px] text-dash-tertiary">Amount</span>
            <input
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="w-full rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
              placeholder="g/ml"
            />
          </div>
          {entry.unit === "pcs" && (
            <div>
              <span className="font-mono text-[9px] text-dash-tertiary">
                {entry.is_drink ? "ml total" : "Grams total"}
              </span>
              <input
                value={editGramsTotal}
                onChange={(e) => setEditGramsTotal(e.target.value)}
                className="w-full rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                placeholder={entry.is_drink ? "ml" : "g"}
              />
            </div>
          )}
          <div>
            <span className="font-mono text-[9px] text-dash-tertiary">kcal</span>
            <input
              value={editCalories}
              onChange={(e) => setEditCalories(e.target.value)}
              className="w-full rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
            />
          </div>
          <div>
            <span className="font-mono text-[9px] text-dash-tertiary">Protein</span>
            <input
              value={editProtein}
              onChange={(e) => setEditProtein(e.target.value)}
              className="w-full rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
            />
          </div>
          <div>
            <span className="font-mono text-[9px] text-dash-tertiary">Carbs</span>
            <input
              value={editCarbs}
              onChange={(e) => setEditCarbs(e.target.value)}
              className="w-full rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
            />
          </div>
          <div>
            <span className="font-mono text-[9px] text-dash-tertiary">Fat</span>
            <input
              value={editFat}
              onChange={(e) => setEditFat(e.target.value)}
              className="w-full rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
            />
          </div>
          <div>
            <span className="font-mono text-[9px] text-dash-tertiary">Sugar</span>
            <input
              value={editSugar}
              onChange={(e) => setEditSugar(e.target.value)}
              className="w-full rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
            />
          </div>
          <div>
            <span className="font-mono text-[9px] text-dash-tertiary">Salt</span>
            <input
              value={editSalt}
              onChange={(e) => setEditSalt(e.target.value)}
              className="w-full rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
            />
          </div>
          <div>
            <span className="font-mono text-[9px] text-dash-tertiary">Water</span>
            <input
              value={editWater}
              onChange={(e) => setEditWater(e.target.value)}
              className="w-full rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
            />
          </div>
          <div>
            <span className="font-mono text-[9px] text-dash-tertiary">Fiber</span>
            <input
              value={editFiber}
              onChange={(e) => setEditFiber(e.target.value)}
              placeholder="?"
              className="w-full rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
            />
          </div>
          <div>
            <span className="font-mono text-[9px] text-dash-tertiary">Sat. fat</span>
            <input
              value={editSaturatedFat}
              onChange={(e) => setEditSaturatedFat(e.target.value)}
              placeholder="?"
              className="w-full rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={hasNegative(
              editAmount,
              editGramsTotal,
              editCalories,
              editProtein,
              editCarbs,
              editFat,
              editSalt,
              editSugar,
              editWater,
              editFiber,
              editSaturatedFat,
            )}
            className="rounded px-3 py-1 font-mono text-[10px] font-bold text-dash-success hover:bg-white/[0.06] disabled:opacity-50"
          >
            <LuCheck className="inline h-3 w-3 mr-1" />
            Save
          </button>
          <button
            onClick={handleCancel}
            className="rounded px-3 py-1 font-mono text-[10px] font-bold text-dash-tertiary hover:bg-white/[0.06]"
          >
            <LuX className="inline h-3 w-3 mr-1" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const amountStr = entry.amount
    ? entry.unit === "pcs" && entry.grams_total != null
      ? `${entry.amount} ${entry.unit} (${entry.grams_total}${entry.is_drink ? "ml" : "g"})`
      : `${entry.amount} ${entry.unit || "g"}`
    : "";

  return (
    <div className="group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.04]">
      <span className="text-lg shrink-0">{entry.emoji}</span>
      <span className="font-mono text-[10px] tabular-nums text-dash-tertiary shrink-0">
        {entry.time}
      </span>
      <span className="font-mono text-[12px] font-semibold text-dash-primary truncate max-w-52 shrink-0">
        {entry.name}
      </span>
      {amountStr && (
        <span className="font-mono text-[10px] text-dash-tertiary shrink-0">{amountStr}</span>
      )}
      <span className="font-mono text-[10px] tabular-nums text-dash-secondary shrink-0">
        {entry.calories} kcal
      </span>
      <span className="hidden sm:inline font-mono text-[10px] tabular-nums text-dash-tertiary shrink-0">
        Protein {entry.protein.toFixed(0)}g
      </span>
      <span className="hidden sm:inline font-mono text-[10px] tabular-nums text-dash-tertiary shrink-0">
        Carbs {entry.carbs.toFixed(0)}g
      </span>
      <span className="hidden sm:inline font-mono text-[10px] tabular-nums text-dash-tertiary shrink-0">
        Fat {entry.fat.toFixed(0)}g
      </span>
      <span className="hidden md:inline font-mono text-[10px] tabular-nums text-dash-tertiary shrink-0">
        Fiber {entry.fiber != null ? `${entry.fiber.toFixed(0)}g` : "-"}
      </span>
      <span className="hidden md:inline font-mono text-[10px] tabular-nums text-dash-tertiary shrink-0">
        Sat. fat {entry.saturated_fat != null ? `${entry.saturated_fat.toFixed(0)}g` : "-"}
      </span>
      <span className="hidden sm:inline font-mono text-[10px] tabular-nums text-dash-tertiary shrink-0">
        Sugar {entry.sugar.toFixed(0)}g
      </span>
      <span className="hidden sm:inline font-mono text-[10px] tabular-nums text-dash-tertiary shrink-0">
        Water {entry.water_ml}ml
      </span>

      <div className="flex-1" />

      <div className="flex items-center gap-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onSaveTemplate?.(entry)}
          className="rounded p-1 text-dash-tertiary hover:text-dash-success"
          title="Save as template"
        >
          <LuSave className="h-3 w-3" />
        </button>
        <button
          onClick={() => setEditing(true)}
          className="rounded p-1 text-dash-tertiary hover:text-dash-secondary"
        >
          <LuPencil className="h-3 w-3" />
        </button>
        <button
          onClick={handleDelete}
          className="rounded p-1 text-dash-tertiary hover:text-[#FF6B6B]"
        >
          <LuTrash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
