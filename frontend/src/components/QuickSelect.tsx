import { useState } from "react";
import { LuClock, LuSparkles, LuPlus } from "react-icons/lu";
import { useRecentMeals, useCreateFoodEntry, useSuggestNutrition } from "../hooks/useFood";
import { AI_GATED_CLASS, aiGateProps, useAiEnabled } from "../hooks/useAi";
import type { RecentMeal } from "../types";
import { hasNegative } from "../utils/number";

interface QuickSelectProps {
  selectedDate: string;
}

export default function QuickSelect({ selectedDate }: QuickSelectProps) {
  const { data: recent, isLoading } = useRecentMeals();

  if (isLoading || !recent || recent.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {recent.map((meal) => (
          <QuickSelectItem
            key={`${meal.name}-${meal.is_drink}`}
            meal={meal}
            selectedDate={selectedDate}
          />
        ))}
      </div>
    </div>
  );
}

function QuickSelectItem({ meal, selectedDate }: { meal: RecentMeal; selectedDate: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [time, setTime] = useState(() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
  });
  const [calories, setCalories] = useState(String(meal.calories));
  const [protein, setProtein] = useState(String(meal.protein));
  const [carbs, setCarbs] = useState(String(meal.carbs));
  const [fat, setFat] = useState(String(meal.fat));
  const [salt, setSalt] = useState(String(meal.salt));
  const [sugar, setSugar] = useState(String(meal.sugar));
  const [fiber, setFiber] = useState(meal.fiber != null ? String(meal.fiber) : "");
  const [saturatedFat, setSaturatedFat] = useState(
    meal.saturated_fat != null ? String(meal.saturated_fat) : "",
  );
  const [amount, setAmount] = useState(meal.amount != null ? String(meal.amount) : "");
  const [unit, setUnit] = useState(meal.unit || (meal.is_drink ? "ml" : "g"));
  const [gramsTotal, setGramsTotal] = useState(meal.grams_total ? String(meal.grams_total) : "");

  const createEntry = useCreateFoodEntry();
  const suggestNutrition = useSuggestNutrition();
  const aiEnabled = useAiEnabled();

  const handleKiRefill = async () => {
    if (!amount) return;
    try {
      const res = await suggestNutrition.mutateAsync({
        name: meal.name,
        amount: parseFloat(amount),
        unit,
      });
      setCalories(String(res.calories));
      setProtein(String(res.protein));
      setCarbs(String(res.carbs));
      setFat(String(res.fat));
      setSalt(String(res.salt));
      setSugar(String(res.sugar));
      setFiber(res.fiber != null ? String(res.fiber) : "");
      setSaturatedFat(res.saturated_fat != null ? String(res.saturated_fat) : "");
    } catch {
      // ignore
    }
  };

  const parseOptional = (value: string): number | null => {
    if (value.trim() === "") return null;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleAdd = () => {
    setError(false);
    const gt = unit === "pcs" && gramsTotal ? parseFloat(gramsTotal) : null;
    createEntry.mutate(
      {
        date: selectedDate,
        time,
        meal_type: meal.meal_type,
        name: meal.name,
        emoji: meal.emoji,
        is_drink: meal.is_drink,
        amount: amount ? parseFloat(amount) : null,
        unit: amount ? unit : null,
        grams_total: gt,
        calories: parseInt(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        salt: parseFloat(salt) || 0,
        sugar: parseFloat(sugar) || 0,
        water_ml: 0,
        fiber: parseOptional(fiber),
        saturated_fat: parseOptional(saturatedFat),
        notes: null,
      },
      {
        onSuccess: () => setOpen(false),
        onError: () => setError(true),
      },
    );
  };

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-2 transition-colors hover:bg-white/[0.08]"
      >
        <span className="text-base">{meal.emoji}</span>
        <span className="font-mono text-[11px] text-dash-secondary">{meal.name}</span>
        <span className="font-mono text-[10px] text-dash-tertiary">{meal.calories} kcal</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-white/[0.08] bg-[#0C0C0D] p-3 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <LuClock className="h-3 w-3 text-dash-tertiary" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
              />
              <button
                onClick={handleKiRefill}
                disabled={aiEnabled && (suggestNutrition.isPending || !amount)}
                {...aiGateProps(aiEnabled)}
                className={`ml-auto rounded px-2 py-1 font-mono text-[10px] font-bold text-dash-success border hover:bg-dash-success/[0.1] disabled:opacity-30 ${AI_GATED_CLASS} ${
                  suggestNutrition.isPending
                    ? "border-dash-success/50 bg-dash-success/[0.1] animate-[ai-border-glow_2s_ease-in-out_infinite]"
                    : "border-dash-success/30"
                }`}
              >
                <LuSparkles className="inline h-3 w-3 mr-0.5" />
                AI
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <span className="font-mono text-[8px] text-dash-tertiary">Amount</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={meal.is_drink ? "500" : "250"}
                  className="w-full rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
                />
              </div>
              <div className="w-14">
                <span className="font-mono text-[8px] text-dash-tertiary">Unit</span>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full rounded bg-white/[0.08] px-1 py-1 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                >
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="pcs">pcs</option>
                  <option value="tsp">tsp</option>
                  <option value="tbsp">tbsp</option>
                </select>
              </div>
            </div>

            {unit === "pcs" && (
              <div className="mb-3">
                <span className="font-mono text-[8px] text-dash-tertiary">
                  {meal.is_drink ? "ml total" : "Grams total"}
                </span>
                <input
                  type="number"
                  value={gramsTotal}
                  onChange={(e) => setGramsTotal(e.target.value)}
                  placeholder="e.g. 300"
                  className="w-full rounded bg-white/[0.08] px-2 py-1 font-mono text-xs text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <div>
                <span className="font-mono text-[8px] text-dash-tertiary">kcal</span>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full rounded bg-white/[0.08] px-1.5 py-1 font-mono text-[11px] text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                />
              </div>
              <div>
                <span className="font-mono text-[8px] text-dash-tertiary">Prot</span>
                <input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="w-full rounded bg-white/[0.08] px-1.5 py-1 font-mono text-[11px] text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                />
              </div>
              <div>
                <span className="font-mono text-[8px] text-dash-tertiary">Carbs</span>
                <input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-full rounded bg-white/[0.08] px-1.5 py-1 font-mono text-[11px] text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                />
              </div>
              <div>
                <span className="font-mono text-[8px] text-dash-tertiary">Fat</span>
                <input
                  type="number"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="w-full rounded bg-white/[0.08] px-1.5 py-1 font-mono text-[11px] text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                />
              </div>
              <div>
                <span className="font-mono text-[8px] text-dash-tertiary">Salt</span>
                <input
                  type="number"
                  value={salt}
                  onChange={(e) => setSalt(e.target.value)}
                  className="w-full rounded bg-white/[0.08] px-1.5 py-1 font-mono text-[11px] text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                />
              </div>
              <div>
                <span className="font-mono text-[8px] text-dash-tertiary">Sugar</span>
                <input
                  type="number"
                  value={sugar}
                  onChange={(e) => setSugar(e.target.value)}
                  className="w-full rounded bg-white/[0.08] px-1.5 py-1 font-mono text-[11px] text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                />
              </div>
              <div>
                <span className="font-mono text-[8px] text-dash-tertiary">Fiber</span>
                <input
                  type="number"
                  value={fiber}
                  onChange={(e) => setFiber(e.target.value)}
                  placeholder="?"
                  className="w-full rounded bg-white/[0.08] px-1.5 py-1 font-mono text-[11px] text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
                />
              </div>
              <div>
                <span className="font-mono text-[8px] text-dash-tertiary">Sat. fat</span>
                <input
                  type="number"
                  value={saturatedFat}
                  onChange={(e) => setSaturatedFat(e.target.value)}
                  placeholder="?"
                  className="w-full rounded bg-white/[0.08] px-1.5 py-1 font-mono text-[11px] text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
                />
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={
                createEntry.isPending ||
                hasNegative(
                  amount,
                  gramsTotal,
                  calories,
                  protein,
                  carbs,
                  fat,
                  salt,
                  sugar,
                  fiber,
                  saturatedFat,
                )
              }
              className={`w-full rounded-full px-4 py-1.5 font-mono text-[10px] font-bold text-black transition-opacity hover:opacity-80 disabled:opacity-50 ${error ? "bg-red-500" : "bg-dash-success"}`}
            >
              <LuPlus className="inline h-3 w-3 mr-1" />
              {error ? "Error, try again" : "Add"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
