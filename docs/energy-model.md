# Readiness and energy curve

The peak tracker on the Performance tab shows two things:

- **Readiness** (0-100): how recovered you are today, from your tracker data.
- **Energy curve**: an estimate of your energy hour by hour, shaped by readiness, caffeine,
  meals and exercise.

Both are simple heuristics, not medical measurements. All numbers are constants at the top of
`backend/app/routers/health_data.py`, so you can tune them to your own experience.
The "Why?" panel under the score shows every input that went into today's values.

## Readiness

Readiness is the **weighted average** of three signals, each scored from 0 to 100:

| Signal | Weight | Score |
|--------|--------|-------|
| Sleep | 40 % | the sleep index of last night (see below) |
| HRV | 30 % | heart rate variability compared with your average, higher is better |
| Resting HR | 30 % | resting heart rate compared with your average, lower is better |

```
readiness = (sleep × 40 + hrv × 30 + resting_hr × 30) / 100
```

**Missing signals** are left out and the remaining weights are scaled up so they add up to 100 %.
With only sleep and HRV, sleep counts 40/70 = 57 % and HRV 30/70 = 43 %. The panel shows the
weight actually used, and "Data coverage" tells how much of the full weight had data (70 % here).
Without any signal there is no readiness score and the curve shows the default rhythm.

### HRV and resting heart rate

Both are compared with your **personal average over the last 90 days** (today excluded):

- equal to your average → 50
- 20 % better than your average → 100 (HRV 20 % higher, resting HR 20 % lower)
- 20 % worse → 0, values in between scale linearly

Until there are at least 5 readings, a fixed scale is used instead:
HRV 20 ms → 0 and 80 ms → 100, resting HR 80 bpm → 0 and 45 bpm → 100.

### Example

Sleep index 80, HRV 66 ms with an average of 60 ms (+10 % → 75), resting HR 52 bpm with an
average of 52 bpm (→ 50):

```
(80 × 40 + 75 × 30 + 50 × 30) / 100 = 69.5 → readiness 70
```

### Sleep index

The sleep index (0-100) is computed from the night's sleep data (hours):

```
50 + 3.5 × asleep - 2 × awake + 2.5 × (deep + REM) - 1.5 × (avg heart rate - 50)
```

Without a heart rate, 50 bpm is assumed. When today has no sleep data yet, the previous night is
used and marked "(previous day)".

## Energy curve

The curve runs from wake-up (end of last night's sleep, otherwise the wake time in the settings)
to bedtime (start of the next sleep, otherwise the settings). It is built in three steps:

1. **Daily rhythm**: energy usually peaks in the late morning, dips after lunch and rises again
   in the late afternoon. With a wake-up at 07:00 and bedtime at 23:00, the curve starts at 0,
   peaks at 85 around 10:30, dips to 38 around 14:00, reaches a second peak of 61 around 17:00
   and falls back to 0 at bedtime. For other times the points move with your day (at 22 %, 44 %
   and 62.5 % of your waking hours).
2. **Readiness** scales the rhythm: the morning peak reaches today's readiness score (readiness
   70 → peak about 70). Low readiness also makes energy fade faster over the day: at readiness
   50 the curve loses up to 25 % more by bedtime. Without readiness data the rhythm stays as it is.
3. **Influences** are added on top for the time they last:

   | Influence | Effect |
   |-----------|--------|
   | Caffeine (coffee, tea, cola, ... detected by name) | +15, halves every 5 h, shown until it is down to a quarter |
   | Carb-heavy meal (over 60 % of its kcal from carbs, at least 30 g) | +10 for 30 min, then -20 for 2 h |
   | Large meal (800 kcal or more) | -10 for 1.5 h, starting 30 min after eating |
   | Hard run (perceived effort 7 or more, or cardio load over 30) | -20 for 1 h, then -5 until bedtime |
   | Light run (all other runs) | +5 for 2 h |
   | Manual adjustment by the AI mentor | as set in the chat |

   Food entries within 30 minutes count as one meal. Each hour of the curve shows the average
   effect during that hour, so a 30-minute effect of +10 adds +5. The result stays between 0
   and 100.

Hours above 70 are shown as productivity windows. The dashed line in the chart is the daily
rhythm without readiness and influences.
