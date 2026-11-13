import { useState, useEffect } from "react";
import { LuX, LuSearch, LuPencil, LuTrash2, LuCheck, LuLibrary, LuPlus } from "react-icons/lu";
import {
  useFoodTemplates,
  useUpdateFoodTemplate,
  useDeleteFoodTemplate,
  useCreateFoodEntry,
} from "../hooks/useFood";
import type { FoodTemplate } from "../types";
import { hasNegative } from "../utils/number";

interface TemplateManagerModalProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
}

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const DEFAULT_TIMES: Record<string, string> = {
  Breakfast: "07:30",
  Lunch: "12:30",
  Dinner: "18:30",
  Snack: "15:00",
};

export default function TemplateManagerModal({
  open,
  onClose,
  selectedDate,
}: TemplateManagerModalProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCalories, setEditCalories] = useState("");
  const [editProtein, setEditProtein] = useState("");
  const [editCarbs, setEditCarbs] = useState("");
  const [editFat, setEditFat] = useState("");
  const [editSalt, setEditSalt] = useState("");
  const [editSugar, setEditSugar] = useState("");
  const [editWater, setEditWater] = useState("");
  const [editFiber, setEditFiber] = useState("");
  const [editSaturatedFat, setEditSaturatedFat] = useState("");
  const [editGramsPerPiece, setEditGramsPerPiece] = useState("");

  const [selectingId, setSelectingId] = useState<number | null>(null);
  const [targetAmount, setTargetAmount] = useState("100");
  const [targetGramsPerPiece, setTargetGramsPerPiece] = useState("");

  const [localMealType, setLocalMealType] = useState<string>("Lunch");
  const [localTime, setLocalTime] = useState(DEFAULT_TIMES["Lunch"]);

  const { data: templates, isLoading } = useFoodTemplates(search || undefined);
  const updateTemplate = useUpdateFoodTemplate();
  const deleteTemplate = useDeleteFoodTemplate();
  const createEntry = useCreateFoodEntry();

  useEffect(() => {
    if (!open) {
      setSearch("");
      setEditingId(null);
      setSelectingId(null);
    }
  }, [open]);

  const handleLocalMealType = (mt: string) => {
    setLocalMealType(mt);
    setLocalTime(DEFAULT_TIMES[mt] || "12:00");
  };

  if (!open) return null;

  const startEdit = (tpl: FoodTemplate) => {
    setEditingId(tpl.id);
    setEditLabel(tpl.label);
    setEditCalories(String(tpl.calories));
    setEditProtein(String(tpl.protein));
    setEditCarbs(String(tpl.carbs));
    setEditFat(String(tpl.fat));
    setEditSalt(String(tpl.salt));
    setEditSugar(String(tpl.sugar));
    setEditWater(String(tpl.water_ml));
    setEditFiber(tpl.fiber != null ? String(tpl.fiber) : "");
    setEditSaturatedFat(tpl.saturated_fat != null ? String(tpl.saturated_fat) : "");
    setEditGramsPerPiece(tpl.grams_per_piece ? String(tpl.grams_per_piece) : "");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (tpl: FoodTemplate) => {
    updateTemplate.mutate({
      id: tpl.id,
      label: editLabel.trim() || tpl.label,
      calories: parseInt(editCalories) || 0,
      protein: parseFloat(editProtein) || 0,
      carbs: parseFloat(editCarbs) || 0,
      fat: parseFloat(editFat) || 0,
      salt: parseFloat(editSalt) || 0,
      sugar: parseFloat(editSugar) || 0,
      water_ml: parseInt(editWater) || 0,
      fiber: editFiber.trim() === "" ? null : parseFloat(editFiber),
      saturated_fat: editSaturatedFat.trim() === "" ? null : parseFloat(editSaturatedFat),
      grams_per_piece: editGramsPerPiece ? parseFloat(editGramsPerPiece) : null,
    });
    setEditingId(null);
  };

  const startSelect = (tpl: FoodTemplate) => {
    setSelectingId(tpl.id);
    setTargetAmount(tpl.unit === "pcs" ? "1" : "100");
    setTargetGramsPerPiece(tpl.grams_per_piece ? String(tpl.grams_per_piece) : "");
  };

  const cancelSelect = () => setSelectingId(null);

  const applyTemplate = (tpl: FoodTemplate) => {
    const amount = parseFloat(targetAmount) || 0;
    if (!amount) return;
    const factor = tpl.unit === "pcs" ? amount : amount / tpl.amount;
    const gpp = parseFloat(targetGramsPerPiece) || null;
    const gramsTotal = tpl.unit === "pcs" && gpp ? Math.round(gpp * amount * 10) / 10 : null;
    createEntry.mutate({
      date: selectedDate,
      time: localTime,
      meal_type: localMealType,
      name: tpl.name,
      emoji: tpl.emoji,
      is_drink: tpl.is_drink,
      amount,
      unit: tpl.unit,
      grams_total: gramsTotal,
      calories: Math.round(tpl.calories * factor),
      protein: Math.round(tpl.protein * factor * 10) / 10,
      carbs: Math.round(tpl.carbs * factor * 10) / 10,
      fat: Math.round(tpl.fat * factor * 10) / 10,
      salt: Math.round(tpl.salt * factor * 100) / 100,
      sugar: Math.round(tpl.sugar * factor * 10) / 10,
      water_ml: Math.round(tpl.water_ml * factor),
      fiber: tpl.fiber == null ? null : Math.round(tpl.fiber * factor * 10) / 10,
      saturated_fat:
        tpl.saturated_fat == null ? null : Math.round(tpl.saturated_fat * factor * 10) / 10,
      notes: null,
    });
    setSelectingId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl border border-white/[0.08] bg-[#0C0C0D] p-5">
        <div className="mb-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <LuLibrary className="h-4 w-4 text-dash-secondary" />
            <span className="font-mono text-[14px] font-bold text-dash-primary">Templates</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-dash-tertiary hover:text-dash-secondary"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mb-3 shrink-0">
          <LuSearch className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dash-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full rounded-lg bg-white/[0.08] py-2 pl-9 pr-3 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
          />
        </div>

        <div className="flex items-center gap-2 mb-3 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {MEAL_TYPES.map((mt) => (
              <button
                key={mt}
                onClick={() => handleLocalMealType(mt)}
                className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold transition-colors ${
                  localMealType === mt
                    ? "bg-dash-success text-black"
                    : "bg-white/[0.06] text-dash-secondary hover:bg-white/[0.1]"
                }`}
              >
                {mt}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <span className="font-mono text-[9px] text-dash-tertiary">Time:</span>
            <input
              type="time"
              value={localTime}
              onChange={(e) => setLocalTime(e.target.value)}
              className="rounded bg-white/[0.08] px-2 py-1 font-mono text-sm text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
            />
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1">
          {isLoading && (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          )}

          {!isLoading && templates?.length === 0 && (
            <div className="py-8 text-center font-mono text-[11px] text-dash-tertiary">
              {search ? "No templates found" : "No templates saved yet"}
            </div>
          )}

          {templates?.map((tpl) => (
            <div
              key={tpl.id}
              className={`rounded-lg transition-colors ${
                selectingId === tpl.id
                  ? "bg-dash-success/10 border border-dash-success/30"
                  : "bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              {editingId === tpl.id ? (
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span>{tpl.emoji}</span>
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="flex-1 rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <span className="font-mono text-[8px] text-dash-tertiary">kcal</span>
                      <input
                        value={editCalories}
                        onChange={(e) => setEditCalories(e.target.value)}
                        className="w-full rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                      />
                    </div>
                    <div>
                      <span className="font-mono text-[8px] text-dash-tertiary">Protein</span>
                      <input
                        value={editProtein}
                        onChange={(e) => setEditProtein(e.target.value)}
                        className="w-full rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                      />
                    </div>
                    <div>
                      <span className="font-mono text-[8px] text-dash-tertiary">Carbs</span>
                      <input
                        value={editCarbs}
                        onChange={(e) => setEditCarbs(e.target.value)}
                        className="w-full rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                      />
                    </div>
                    <div>
                      <span className="font-mono text-[8px] text-dash-tertiary">Fat</span>
                      <input
                        value={editFat}
                        onChange={(e) => setEditFat(e.target.value)}
                        className="w-full rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                      />
                    </div>
                    <div>
                      <span className="font-mono text-[8px] text-dash-tertiary">Salt</span>
                      <input
                        value={editSalt}
                        onChange={(e) => setEditSalt(e.target.value)}
                        className="w-full rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                      />
                    </div>
                    <div>
                      <span className="font-mono text-[8px] text-dash-tertiary">Sugar</span>
                      <input
                        value={editSugar}
                        onChange={(e) => setEditSugar(e.target.value)}
                        className="w-full rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                      />
                    </div>
                    <div>
                      <span className="font-mono text-[8px] text-dash-tertiary">Water</span>
                      <input
                        value={editWater}
                        onChange={(e) => setEditWater(e.target.value)}
                        className="w-full rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                      />
                    </div>
                    <div>
                      <span className="font-mono text-[8px] text-dash-tertiary">Fiber</span>
                      <input
                        value={editFiber}
                        onChange={(e) => setEditFiber(e.target.value)}
                        placeholder="?"
                        className="w-full rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
                      />
                    </div>
                    <div>
                      <span className="font-mono text-[8px] text-dash-tertiary">Sat. fat</span>
                      <input
                        value={editSaturatedFat}
                        onChange={(e) => setEditSaturatedFat(e.target.value)}
                        placeholder="?"
                        className="w-full rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
                      />
                    </div>
                    {tpl.unit === "pcs" && (
                      <div>
                        <span className="font-mono text-[8px] text-dash-tertiary">
                          {tpl.is_drink ? "ml/pc" : "g/pc"}
                        </span>
                        <input
                          value={editGramsPerPiece}
                          onChange={(e) => setEditGramsPerPiece(e.target.value)}
                          className="w-full rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                          placeholder="150"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(tpl)}
                      disabled={hasNegative(
                        editCalories,
                        editProtein,
                        editCarbs,
                        editFat,
                        editSalt,
                        editSugar,
                        editWater,
                        editFiber,
                        editSaturatedFat,
                        editGramsPerPiece,
                      )}
                      className="rounded px-3 py-1 font-mono text-[10px] font-bold text-dash-success hover:bg-white/[0.06] disabled:opacity-50"
                    >
                      <LuCheck className="inline h-3 w-3 mr-1" />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded px-3 py-1 font-mono text-[10px] font-bold text-dash-tertiary hover:bg-white/[0.06]"
                    >
                      <LuX className="inline h-3 w-3 mr-1" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : selectingId === tpl.id ? (
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span>{tpl.emoji}</span>
                    <span className="font-mono text-[12px] font-semibold text-dash-primary">
                      {tpl.label}
                    </span>
                  </div>

                  <div className="rounded bg-white/[0.06] p-2 text-center">
                    <span className="font-mono text-[10px] text-dash-tertiary">
                      {tpl.calories} kcal · P: {tpl.protein}g · C: {tpl.carbs}g · F: {tpl.fat}g
                    </span>
                    <span className="ml-2 font-mono text-[10px] text-dash-success">
                      per {tpl.amount} {tpl.unit}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="font-mono text-[10px] text-dash-tertiary shrink-0">
                      Amount ({tpl.unit}):
                    </label>
                    <input
                      type="number"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      className="flex-1 rounded bg-white/[0.08] px-2 py-1.5 font-mono text-sm text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                    />
                  </div>

                  {tpl.unit === "pcs" && (
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-[10px] text-dash-tertiary shrink-0">
                        {tpl.is_drink ? "ml/pc" : "g/pc"}:
                      </label>
                      <input
                        type="number"
                        value={targetGramsPerPiece}
                        onChange={(e) => setTargetGramsPerPiece(e.target.value)}
                        placeholder={tpl.grams_per_piece ? String(tpl.grams_per_piece) : "150"}
                        className="flex-1 rounded bg-white/[0.08] px-2 py-1.5 font-mono text-sm text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                      />
                    </div>
                  )}

                  {targetAmount && (
                    <div className="rounded bg-white/[0.04] p-2">
                      <span className="font-mono text-[9px] text-dash-tertiary">
                        Scaled:{" "}
                        {Math.round(
                          tpl.calories *
                            (tpl.unit === "pcs"
                              ? parseFloat(targetAmount) || 0
                              : parseFloat(targetAmount) / tpl.amount || 0),
                        )}{" "}
                        kcal · P:{" "}
                        {(
                          tpl.protein *
                          (tpl.unit === "pcs"
                            ? parseFloat(targetAmount) || 0
                            : parseFloat(targetAmount) / tpl.amount || 0)
                        ).toFixed(1)}
                        g · C:{" "}
                        {(
                          tpl.carbs *
                          (tpl.unit === "pcs"
                            ? parseFloat(targetAmount) || 0
                            : parseFloat(targetAmount) / tpl.amount || 0)
                        ).toFixed(1)}
                        g · F:{" "}
                        {(
                          tpl.fat *
                          (tpl.unit === "pcs"
                            ? parseFloat(targetAmount) || 0
                            : parseFloat(targetAmount) / tpl.amount || 0)
                        ).toFixed(1)}
                        g
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={cancelSelect}
                      className="flex-1 rounded px-3 py-1.5 font-mono text-[10px] font-bold text-dash-tertiary hover:bg-white/[0.06]"
                    >
                      <LuX className="inline h-3 w-3 mr-1" />
                      Cancel
                    </button>
                    <button
                      onClick={() => applyTemplate(tpl)}
                      disabled={
                        !targetAmount ||
                        createEntry.isPending ||
                        hasNegative(targetAmount, targetGramsPerPiece)
                      }
                      className="flex-1 rounded px-3 py-1.5 font-mono text-[10px] font-bold text-black bg-dash-success hover:opacity-80 disabled:opacity-50"
                    >
                      <LuPlus className="inline h-3 w-3 mr-1" />
                      {createEntry.isPending ? "…" : "Add entry"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-lg shrink-0">{tpl.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[12px] font-semibold text-dash-primary truncate">
                      {tpl.label}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[9px] text-dash-tertiary">
                      <span>{tpl.name}</span>
                      <span>·</span>
                      <span>
                        {tpl.calories} kcal / {tpl.amount} {tpl.unit}
                      </span>
                    </div>
                    <div className="font-mono text-[9px] text-dash-tertiary">
                      P: {tpl.protein}g · C: {tpl.carbs}g · F: {tpl.fat}g
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => startEdit(tpl)}
                      className="rounded p-1 text-dash-tertiary hover:text-dash-secondary"
                      title="Edit"
                    >
                      <LuPencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete template "${tpl.label}"?`)) {
                          deleteTemplate.mutate(tpl.id);
                        }
                      }}
                      className="rounded p-1 text-dash-tertiary hover:text-[#FF6B6B]"
                      title="Delete"
                    >
                      <LuTrash2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => startSelect(tpl)}
                      className="rounded px-2 py-1 ml-1 font-mono text-[9px] font-bold text-dash-success hover:bg-dash-success/10"
                      title="Use as entry"
                    >
                      Select
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
