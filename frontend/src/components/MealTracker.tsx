import { useState, useRef, useEffect } from "react";
import {
  LuImage,
  LuCamera,
  LuPencilLine,
  LuGlassWater,
  LuSparkles,
  LuPlus,
  LuLibrary,
} from "react-icons/lu";
import {
  useCreateFoodEntry,
  useKnownFoods,
  useAnalyzePhoto,
  useSuggestNutrition,
  useDaySummary,
} from "../hooks/useFood";
import type { KnownFood, PhotoAnalysisResult } from "../types";
import { hasNegative } from "../utils/number";
import { AI_GATED_CLASS, aiGateProps, useAiEnabled } from "../hooks/useAi";

interface MealTrackerProps {
  selectedDate: string;
  onOpenTemplates?: () => void;
}

type EntryMode = "photo" | "manual" | "drink";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const DEFAULT_TIMES: Record<string, string> = {
  Breakfast: "07:30",
  Lunch: "12:30",
  Dinner: "18:30",
  Snack: "15:00",
};

function formatWater(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} l`;
  return `${Math.round(ml)} ml`;
}

function WaterBadge({ ml }: { ml: number }) {
  return (
    <span className="ml-auto font-mono text-[11px] tabular-nums text-dash-secondary">
      💧 {formatWater(ml)}
    </span>
  );
}

export default function MealTracker({ selectedDate, onOpenTemplates }: MealTrackerProps) {
  const [mode, setMode] = useState<EntryMode | null>(null);
  const [mealType, setMealType] = useState<string>("Lunch");
  const [time, setTime] = useState(DEFAULT_TIMES["Lunch"]);

  const createEntry = useCreateFoodEntry();
  const { data: knownFoods } = useKnownFoods();
  const analyzePhoto = useAnalyzePhoto();
  const suggestNutrition = useSuggestNutrition();
  const { data: daySummary } = useDaySummary(selectedDate);
  const aiEnabled = useAiEnabled();

  const handleMealTypeChange = (mt: string) => {
    setMealType(mt);
    setTime(DEFAULT_TIMES[mt] || "12:00");
  };

  const handleCancel = () => setMode(null);

  const handleSubmit = (data: {
    name: string;
    emoji: string;
    is_drink: boolean;
    amount: number | null;
    unit: string | null;
    grams_total: number | null;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    salt: number;
    sugar: number;
    water_ml: number;
    fiber: number | null;
    saturated_fat: number | null;
    notes: string | null;
  }) => {
    createEntry.mutate({
      date: selectedDate,
      time,
      meal_type: mealType,
      ...data,
    });
    setMode(null);
  };

  const buttons = [
    { mode: "photo" as EntryMode, icon: LuCamera, label: "Photo", ai: true },
    { mode: "manual" as EntryMode, icon: LuPencilLine, label: "Manual" },
    { mode: "drink" as EntryMode, icon: LuGlassWater, label: "Drink" },
    { mode: null, icon: LuLibrary, label: "Templates", onClick: onOpenTemplates },
  ];

  return (
    <div className="space-y-4">
      {!mode && (
        <>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
              Log food
            </span>
            {daySummary && <WaterBadge ml={daySummary.total_water_ml} />}
          </div>
          <div className="flex gap-3">
            {buttons.map((btn) => (
              <button
                key={btn.label}
                onClick={() => (btn.onClick ? btn.onClick() : setMode(btn.mode as EntryMode))}
                {...(btn.ai ? aiGateProps(aiEnabled) : {})}
                className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 transition-colors hover:bg-white/[0.08] ${AI_GATED_CLASS}`}
              >
                <btn.icon className="h-6 w-6 text-dash-secondary" />
                <span className="font-mono text-[11px] font-bold text-dash-secondary">
                  {btn.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {mode && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {MEAL_TYPES.map((mt) => (
              <button
                key={mt}
                onClick={() => handleMealTypeChange(mt)}
                className={`rounded-full px-3 py-1 font-mono text-[10px] font-bold transition-colors ${
                  mealType === mt
                    ? "bg-dash-success text-black"
                    : "bg-white/[0.06] text-dash-secondary hover:bg-white/[0.1]"
                }`}
              >
                {mt}
              </button>
            ))}
          </div>

          <div className="mb-4 flex items-center gap-2">
            <span className="font-mono text-[10px] text-dash-tertiary">Time:</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-lg bg-white/[0.08] px-3 py-1.5 font-mono text-sm text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
            />
          </div>

          {mode === "photo" && (
            <PhotoForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              analyzePhoto={analyzePhoto}
              isSubmitting={createEntry.isPending}
            />
          )}

          {(mode === "manual" || mode === "drink") && (
            <ManualForm
              isDrink={mode === "drink"}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              knownFoods={knownFoods ?? []}
              suggestNutrition={suggestNutrition}
              isSubmitting={createEntry.isPending}
            />
          )}
        </div>
      )}
    </div>
  );
}

function PhotoForm({
  onSubmit,
  onCancel,
  analyzePhoto,
  isSubmitting,
}: {
  onSubmit: (data: {
    name: string;
    emoji: string;
    is_drink: boolean;
    amount: number | null;
    unit: string | null;
    grams_total: number | null;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    salt: number;
    sugar: number;
    water_ml: number;
    fiber: number | null;
    saturated_fat: number | null;
    notes: string | null;
  }) => void;
  onCancel: () => void;
  analyzePhoto: ReturnType<typeof useAnalyzePhoto>;
  isSubmitting: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("g");
  const [gramsTotal, setGramsTotal] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<PhotoAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [pasteHint, setPasteHint] = useState(false);

  useEffect(() => {
    if (!analyzePhoto.isPending) {
      setProgress(0);
      return;
    }
    const start = Date.now();
    const duration = 15000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 99);
      setProgress(pct);
    }, 150);
    return () => clearInterval(interval);
  }, [analyzePhoto.isPending]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData?.items) return;
      for (const item of e.clipboardData.items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) continue;
          const ext = item.type.split("/")[1] || "png";
          const pastedFile = new File([blob], `clipboard.${ext}`, { type: item.type });
          setFile(pastedFile);
          setPreview(URL.createObjectURL(pastedFile));
          setResult(null);
          setError(null);
          setPasteHint(false);
          break;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setError(null);
    try {
      const res = await analyzePhoto.mutateAsync({ file, notes: notes || undefined });
      setResult(res);
      if (res.amount != null) setAmount(String(res.amount));
      if (res.unit) setUnit(res.unit);
    } catch {
      setError("Analysis failed. Please try again.");
    }
  };

  const handleSubmit = () => {
    if (!result) return;
    const amt = amount ? parseFloat(amount) : null;
    const gt = unit === "pcs" && gramsTotal ? parseFloat(gramsTotal) : null;
    onSubmit({
      name: result.name,
      emoji: result.emoji,
      is_drink: false,
      amount: amt,
      unit: amt ? unit : null,
      grams_total: gt,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      salt: result.salt,
      sugar: result.sugar,
      water_ml: result.water_ml ?? 0,
      fiber: result.fiber ?? null,
      saturated_fat: result.saturated_fat ?? null,
      notes: notes || null,
    });
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!preview && (
        <button
          onClick={() => fileRef.current?.click()}
          onMouseEnter={() => setPasteHint(true)}
          onMouseLeave={() => setPasteHint(false)}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/[0.1] bg-white/[0.02] py-10 transition-colors hover:border-white/[0.2]"
        >
          <LuImage className="h-8 w-8 text-dash-tertiary" />
          <span className="font-mono text-sm text-dash-tertiary">Choose a photo</span>
          <span
            className={`font-mono text-[10px] text-dash-tertiary/50 transition-opacity duration-200 ${pasteHint ? "opacity-100" : "opacity-0"}`}
          >
            or paste with Ctrl+V
          </span>
        </button>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl">
            <img src={preview} alt="Preview" className="w-full max-h-48 object-cover" />
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
                setResult(null);
              }}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
            >
              ×
            </button>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for the AI (e.g. portion size, ingredients)…"
            className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-xs text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success resize-none"
            rows={2}
          />

          {!result && !analyzePhoto.isPending && (
            <button
              onClick={handleAnalyze}
              disabled={!file}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-white to-[#E8E5DD] px-5 py-2.5 font-mono text-[11px] font-bold text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-px hover:brightness-110 disabled:opacity-50"
            >
              <LuSparkles className="h-4 w-4" />
              Analyze with AI
            </button>
          )}

          {analyzePhoto.isPending && (
            <div className="space-y-3 rounded-xl border border-dash-success/30 animate-[ai-border-glow_2s_ease-in-out_infinite] p-3">
              <div className="flex items-center gap-2 font-mono text-xs text-dash-success">
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-dash-success animate-[ai-dot_1.2s_ease-in-out_infinite]"
                    style={{ animationDelay: "0s" }}
                  />
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-dash-success animate-[ai-dot_1.2s_ease-in-out_infinite]"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-dash-success animate-[ai-dot_1.2s_ease-in-out_infinite]"
                    style={{ animationDelay: "0.4s" }}
                  />
                </span>
                Analyzing photo…
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-dash-success transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && <div className="font-mono text-xs text-[#FF6B6B]">{error}</div>}

          {result && (
            <div className="rounded-xl bg-white/[0.04] p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{result.emoji}</span>
                <span className="font-mono text-sm font-semibold text-dash-primary">
                  {result.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-dash-secondary sm:grid-cols-3">
                <span>{result.calories} kcal</span>
                <span>Protein: {result.protein}g</span>
                <span>Carbs: {result.carbs}g</span>
                <span>Fat: {result.fat}g</span>
                <span>Salt: {result.salt}g</span>
                <span>Sugar: {result.sugar}g</span>
                <span>Water: {result.water_ml}ml</span>
                <span>Fiber: {result.fiber != null ? `${result.fiber}g` : "-"}</span>
                <span>
                  Saturated fat: {result.saturated_fat != null ? `${result.saturated_fat}g` : "-"}
                </span>
              </div>
            </div>
          )}

          {result && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">
                  Amount ({unit})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
                />
              </div>
              <div className="w-16">
                <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full rounded-lg bg-white/[0.08] px-2 py-2 font-mono text-sm text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
                >
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="pcs">pcs</option>
                  <option value="tsp">tsp</option>
                  <option value="tbsp">tbsp</option>
                </select>
              </div>
            </div>
          )}

          {result && unit === "pcs" && (
            <div>
              <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">
                Grams total
              </label>
              <input
                type="number"
                value={gramsTotal}
                onChange={(e) => setGramsTotal(e.target.value)}
                placeholder="e.g. 300"
                className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
              />
            </div>
          )}

          {result && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || hasNegative(amount, gramsTotal)}
              className="w-full rounded-full bg-dash-success px-5 py-2.5 font-mono text-[11px] font-bold text-black transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : "Add entry"}
            </button>
          )}
        </div>
      )}

      <button
        onClick={onCancel}
        className="w-full rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 font-mono text-[11px] font-bold text-dash-primary transition-all hover:bg-white/10"
      >
        Cancel
      </button>
    </div>
  );
}

function ManualForm({
  isDrink,
  onSubmit,
  onCancel,
  knownFoods,
  suggestNutrition,
  isSubmitting,
}: {
  isDrink: boolean;
  onSubmit: (data: {
    name: string;
    emoji: string;
    is_drink: boolean;
    amount: number | null;
    unit: string | null;
    grams_total: number | null;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    salt: number;
    sugar: number;
    water_ml: number;
    fiber: number | null;
    saturated_fat: number | null;
    notes: string | null;
  }) => void;
  onCancel: () => void;
  knownFoods: KnownFood[];
  suggestNutrition: ReturnType<typeof useSuggestNutrition>;
  isSubmitting: boolean;
}) {
  const aiEnabled = useAiEnabled();
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(isDrink ? "💧" : "🍽️");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState(isDrink ? "ml" : "g");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [salt, setSalt] = useState("");
  const [sugar, setSugar] = useState("");
  const [waterMl, setWaterMl] = useState("");
  const [fiber, setFiber] = useState("");
  const [saturatedFat, setSaturatedFat] = useState("");
  const [gramsTotal, setGramsTotal] = useState("");

  const filteredFoods = knownFoods
    .filter(
      (f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) &&
        (isDrink ? f.category === "Drink" : f.category !== "Drink"),
    )
    .slice(0, 10);

  const handleSelectFood = (food: KnownFood) => {
    setSearch(food.name);
    setSelectedEmoji(food.emoji);
    setShowDropdown(false);
  };

  const handleKiAutofill = async () => {
    if (!search || !amount) return;
    try {
      const res = await suggestNutrition.mutateAsync({
        name: search,
        amount: parseFloat(amount),
        unit,
      });
      setSelectedEmoji(res.emoji);
      setCalories(String(res.calories));
      setProtein(String(res.protein));
      setCarbs(String(res.carbs));
      setFat(String(res.fat));
      setSalt(String(res.salt));
      setSugar(String(res.sugar));
      setWaterMl(String(res.water_ml ?? 0));
      setFiber(res.fiber != null ? String(res.fiber) : "");
      setSaturatedFat(res.saturated_fat != null ? String(res.saturated_fat) : "");
    } catch {
      // silently fail, user fills manually
    }
  };

  const parseOptional = (value: string): number | null => {
    if (value.trim() === "") return null;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleSubmit = () => {
    const amt = parseFloat(amount) || null;
    const gt = unit === "pcs" && gramsTotal ? parseFloat(gramsTotal) : null;
    onSubmit({
      name: search || "Unknown",
      emoji: selectedEmoji,
      is_drink: isDrink,
      amount: amt,
      unit: amt ? unit : null,
      grams_total: gt,
      calories: parseInt(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      salt: parseFloat(salt) || 0,
      sugar: parseFloat(sugar) || 0,
      water_ml: parseInt(waterMl) || (isDrink ? parseInt(amount) || 0 : 0),
      fiber: parseOptional(fiber),
      saturated_fat: parseOptional(saturatedFat),
      notes: null,
    });
  };

  const canSubmit =
    search.trim().length > 0 &&
    !hasNegative(
      amount,
      gramsTotal,
      calories,
      protein,
      carbs,
      fat,
      salt,
      sugar,
      waterMl,
      fiber,
      saturatedFat,
    );

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.08] px-3 py-2">
          <span className="text-lg">{selectedEmoji}</span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder={isDrink ? "Search drinks…" : "Search meals or ingredients…"}
            className="flex-1 bg-transparent font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none"
          />
        </div>

        {showDropdown && filteredFoods.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#0C0C0D] shadow-lg">
            {filteredFoods.map((food) => (
              <button
                key={food.id}
                onMouseDown={() => handleSelectFood(food)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
              >
                <span>{food.emoji}</span>
                <span className="font-mono text-xs text-dash-secondary">{food.name}</span>
                <span className="ml-auto font-mono text-[9px] text-dash-tertiary">
                  {food.category}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">
            Amount ({unit})
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={isDrink ? "500" : "250"}
            className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
          />
        </div>
        <div className="w-16">
          <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-lg bg-white/[0.08] px-2 py-2 font-mono text-sm text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
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
        <div>
          <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">
            {isDrink ? "ml total" : "Grams total"}
          </label>
          <input
            type="number"
            value={gramsTotal}
            onChange={(e) => setGramsTotal(e.target.value)}
            placeholder="e.g. 300"
            className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">kcal</label>
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">Protein (g)</label>
          <input
            type="number"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">Carbs (g)</label>
          <input
            type="number"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">Fat (g)</label>
          <input
            type="number"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">Salt (g)</label>
          <input
            type="number"
            value={salt}
            onChange={(e) => setSalt(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">Sugar (g)</label>
          <input
            type="number"
            value={sugar}
            onChange={(e) => setSugar(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">Water (ml)</label>
          <input
            type="number"
            value={waterMl}
            onChange={(e) => setWaterMl(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">Fiber (g)</label>
          <input
            type="number"
            value={fiber}
            onChange={(e) => setFiber(e.target.value)}
            placeholder="?"
            className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] text-dash-tertiary">
            Saturated fat (g)
          </label>
          <input
            type="number"
            value={saturatedFat}
            onChange={(e) => setSaturatedFat(e.target.value)}
            placeholder="?"
            className="w-full rounded-lg bg-white/[0.08] px-3 py-2 font-mono text-sm text-dash-primary placeholder-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success"
          />
        </div>
      </div>

      <button
        onClick={handleKiAutofill}
        disabled={aiEnabled && (!search || !amount || suggestNutrition.isPending)}
        {...aiGateProps(aiEnabled)}
        className={`flex w-full items-center justify-center gap-2 rounded-full border px-5 py-2 font-mono text-[11px] font-bold text-dash-success transition-colors hover:bg-dash-success/[0.15] disabled:opacity-50 ${AI_GATED_CLASS} ${
          suggestNutrition.isPending
            ? "border-dash-success/50 bg-dash-success/[0.12] animate-[ai-border-glow_2s_ease-in-out_infinite]"
            : "border-dash-success/30 bg-dash-success/[0.08]"
        }`}
      >
        {suggestNutrition.isPending ? (
          <span className="flex items-center gap-1.5">
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-1 w-1 rounded-full bg-dash-success animate-[ai-dot_1.2s_ease-in-out_infinite]"
                style={{ animationDelay: "0s" }}
              />
              <span
                className="inline-block h-1 w-1 rounded-full bg-dash-success animate-[ai-dot_1.2s_ease-in-out_infinite]"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="inline-block h-1 w-1 rounded-full bg-dash-success animate-[ai-dot_1.2s_ease-in-out_infinite]"
                style={{ animationDelay: "0.4s" }}
              />
            </span>
            AI is analyzing
          </span>
        ) : (
          <>
            <LuSparkles className="h-4 w-4" /> Complete with AI
          </>
        )}
      </button>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 font-mono text-[11px] font-bold text-dash-primary transition-all hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="flex-1 rounded-full bg-dash-success px-5 py-2 font-mono text-[11px] font-bold text-black transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          <LuPlus className="inline h-3 w-3 mr-1" />
          {isSubmitting ? "Saving…" : "Add entry"}
        </button>
      </div>
    </div>
  );
}
