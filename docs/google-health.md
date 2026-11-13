# Connecting a Fitbit or Pixel Watch (Google Health API)

Sleep, readiness, resting heart rate, HRV, SpO2, steps and run cardio data come from a
*health provider*. The built-in one reads your **Fitbit** or **Pixel Watch** data through the
[Google Health API](https://developers.google.com/health/setup).

> Using Whoop, Garmin, Oura or another tracker? You can plug in your own provider, see
> [adding-a-health-provider.md](adding-a-health-provider.md). Without any tracker, set
> `HEALTH_PROVIDER=none` (everything else works) or `HEALTH_PROVIDER=demo` to try the app with
> generated data.

The app uses the OAuth refresh-token flow: you register your own OAuth app once, create a refresh
token for your Google account and put three values into `.env`. The app never asks you to log in.

Prerequisite: your Fitbit data lives in a Google account (Fitbit accounts must be migrated to
Google). Old Fitbit Web API tokens do not work with the Google Health API.

## 1. Create a Google Cloud project and enable the API

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create a new project
   (project selector at the top → **New project**).
2. Go to **APIs & Services → Library**, search for **Google Health API** and click **Enable**.

## 2. Configure the OAuth consent screen

1. **APIs & Services → OAuth consent screen → Get started**.
2. Enter an app name (e.g. "Health Habit Starter") and your email, choose audience **External**.
3. Under **Audience → Test users**, add the Google account that holds your Fitbit data.
4. Under **Data access → Add or remove scopes**, add these read-only scopes:

   ```
   https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly
   https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly
   https://www.googleapis.com/auth/googlehealth.sleep.readonly
   https://www.googleapis.com/auth/googlehealth.profile.readonly
   ```

> **Publish the app before you create the refresh token (section 4).** While the app is in
> *Testing*, refresh tokens [expire after 7 days](https://developers.google.com/identity/protocols/oauth2#expiration),
> and you would have to repeat section 4 every week. Click **Audience → Publish app**. After that,
> tokens only expire when revoked or unused for about six months
> ([setup guide](https://developers.google.com/health/setup)).
>
> You don't need Google's verification for personal use: unverified apps may have up to 100 users,
> and Google [explicitly allows](https://support.google.com/cloud/answer/13464323) personal-use
> apps to run without it. When you authorize, Google may first show "Google hasn't verified this
> app"; continue via **Advanced**.

## 3. Create the OAuth client

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Authorized redirect URI: `https://developers.google.com/oauthplayground`
4. Click **Create** and copy the **client ID** and **client secret**.

## 4. Get a refresh token (OAuth Playground)

1. Open the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Click the gear icon (top right), tick **Use your own OAuth credentials** and paste your client
   ID and secret. Leave *Access type* on **Offline**.
3. In **Step 1**, paste the four scopes from above (space-separated) into *Input your own scopes*
   and click **Authorize APIs**. Sign in with the account you added as test user and allow access.
4. In **Step 2**, click **Exchange authorization code for tokens** and copy the **Refresh token**.

## 5. Configure the app

Add to your `.env` (next to `docker-compose.yml`, or `backend/.env` for local development):

```env
HEALTH_PROVIDER=google
GOOGLE_HEALTH_CLIENT_ID=<client ID>
GOOGLE_HEALTH_CLIENT_SECRET=<client secret>
GOOGLE_HEALTH_REFRESH_TOKEN=<refresh token>
```

Apply it with `docker compose up -d` (in development: restart uvicorn). The Performance tab should now show **Google Health: connected**.
`HEALTH_PROVIDER=auto` (the default) also picks Google as soon as a refresh token is set.

## Troubleshooting

| Symptom | Cause and fix |
|---------|---------------|
| `Token refresh failed: HTTP 400` | Refresh token expired (Testing mode, 7 days) or revoked: repeat step 4. Also check client ID/secret. |
| HTTP 403 on data calls | Google Health API not enabled (step 1) or a scope missing (steps 2 and 4). Check the granted scopes with `curl "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=<access token>"` (access token from step 4). |
| Connected, but no sleep data | The tracker has not synced yet, or the night ends on a different day than selected. |

Data is fetched on demand and cached in the database: past days once, today's daily metrics at
most every 30 minutes.

## Further reading

- [Google Health API: setup](https://developers.google.com/health/setup) and
  [scopes](https://developers.google.com/health/scopes)
- [Fitbit Web API migration guide](https://developers.google.com/health/migration)
- Nango's walkthrough with screenshots:
  [How to register your own Google Health API OAuth app](https://nango.dev/docs/api-integrations/google-health/how-to-register-your-own-google-health-api-oauth-app)
  (skip the Nango-specific steps and use the OAuth Playground redirect URI from step 3)
