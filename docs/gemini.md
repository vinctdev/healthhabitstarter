# AI features (Google Gemini)

The AI features use Google Gemini:

- **AI mentor** (AI tab): chat about your data, can adjust your energy curve
- **Photo analysis**: nutrition facts from a meal photo
- **Nutrition suggestions**: "Complete with AI" when logging food
- **Goal polishing**: "✨ Polish" turns a rough note into a clear goal

They are **optional**. Without a key the rest of the app works normally; the AI buttons are
greyed out ("Needs GEMINI_API_KEY") and the AI tab shows the setup steps.

## Get a free API key

1. Open [Google AI Studio → API keys](https://aistudio.google.com/apikey) and sign in with your
   Google account.
2. Click **Create API key**. For new users, AI Studio creates a Google Cloud project automatically.
3. Add the key to your `.env` (or `backend/.env` for local development) and apply it with
   `docker compose up -d` (in development: restart uvicorn):

   ```env
   GEMINI_API_KEY=<your key>
   ```

Treat the key like a password and never commit it. It stays on the server; the browser never sees it.

## Choosing a model (optional)

```env
GEMINI_MODEL=gemini-3.5-flash-lite   # default: fast, cheap, available in the free tier
```

Any model id from the [model list](https://aistudio.google.com/docs/models) works, e.g.
`gemini-3.8-flash` for better answers at higher cost and lower free limits.

## Free tier limits

The free tier has per-project limits on requests per minute and per day (reset at midnight Pacific
time). See your current limits in [AI Studio](https://aistudio.google.com/rate-limit) and the
[rate limit docs](https://aistudio.google.com/docs/rate-limits). A chat question can use
several requests, because the mentor calls tools to read your data.

## Privacy: what is sent to Google

- **Photo analysis**: the photo and your notes
- **Nutrition suggestions**: food name and amount
- **Goal polishing**: the goal text
- **AI mentor**: your messages and the data the mentor reads through its tools (meals, sleep,
  sport, supplements, body measurements, energy curve, goals and settings such as wake and sleep
  times)

On the **free tier**, Google may use this content to improve its products, and human reviewers
may read it. Google's terms explicitly say not to submit sensitive or personal information to the
free tier, and health data is sensitive. If that matters to you, enable billing on the Cloud
project (paid tier: content is not used for product improvement), or leave the AI features off.
Users in the EEA, Switzerland and the UK get the paid-tier data terms for the free quota as well.
Details: [Gemini API terms](https://aistudio.google.com/docs/terms) and
[pricing](https://aistudio.google.com/docs/pricing).

How the features work internally (endpoints, the mentor's tools): [architecture.md](architecture.md#ai-features).

The AI output is not medical advice.
