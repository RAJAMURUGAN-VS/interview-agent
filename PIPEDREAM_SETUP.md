# Pipedream Connect YouTube Integration - Setup Guide

## What Was Implemented

### Backend Changes
1. **Real Pipedream API Integration** (`backend/app/services/pipedream_service.py`):
   - Implemented `create_connect_token()` to make real API calls to Pipedream
   - Implemented `_get_project_token()` to handle OAuth2 client credentials flow
   - Added token caching with `@lru_cache` (55-minute TTL)
   - Improved error messages to guide users to configure credentials

2. **Enhanced Error Handling**:
   - Validates Pipedream credentials are configured
   - Returns clear error messages when credentials are missing or invalid
   - Includes timeout handling for API requests

### Frontend Changes
1. **`frontend/src/hooks/usePlaylistGenerator.ts`**:
   - Added proper error checking for `connect_url` in the response
   - Added validation that `connect_url` exists before opening popup
   - Added popup window validation with user-friendly error message
   - Better error state management

2. **`frontend/src/api/playlistApi.ts`**:
   - Added HTTP status code checking
   - Added timeout detection
   - Better error propagation

3. **`frontend/src/types/index.ts`**:
   - Updated `PlaylistConnectTokenResponse` type to include error fields
   - Made `connect_url` optional to handle error responses

## Issue Fix: "about:blank" Popup

Even after the backend fix, some browsers leave the Pipedream popup stuck on
`about:blank` (a white/blank window) instead of navigating to the Pipedream
Connect URL. The cause is the original pattern: open `about:blank` to satisfy
the popup-blocker user-gesture rule, then set `popupWindow.location.href` to
the cross-origin Pipedream URL after an async fetch — some browsers silently
drop that cross-origin navigation.

**Fixed by:**
- Pre-fetching the Pipedream connect token in the background as soon as the
  user enters the `connect_prompt` phase (`handleConfirmRoadmap` and the
  `awaiting_connection` job-polling branch in
  `frontend/src/hooks/usePlaylistGenerator.ts`).
- In `ConnectAccountPrompt.tsx`, the click handler no longer pre-opens an
  `about:blank` popup. It just calls `onConnect()`, and the hook opens the
  popup directly with the pre-fetched URL — so the popup lands on Pipedream
  on the first paint.
- If the click happens before the pre-fetch finishes, the hook falls back
  to fetching the URL synchronously and opening a fresh popup in the click
  handler. `window.open` is still considered a user-gesture operation when
  invoked from inside the click handler chain.

## Issue Fix: "Please include the app in the Connect URL"

The Pipedream-hosted Connect page (`https://connect.pipedream.com/...`) shows the
error "Please include the app in the Connect URL. Please retry or contact support."
when the `app` query parameter is missing from the URL it receives.

The Pipedream `POST /v1/connect/{project_id}/tokens` endpoint returns a generic
`connect_link_url` that is *not* pre-bound to a specific app. The frontend then
opens that URL, and the hosted UI doesn't know which app to display.

**Fixed by:**
- Stop sending the `app` field in the token-creation request body
  (Pipedream's `/tokens` endpoint does not accept it — it caused the request
  to fail validation in some cases).
- After receiving the `connect_link_url`, append `&app=google_youtube` (or
  `?app=google_youtube` if the URL has no existing query) so the hosted UI
  knows which app to show. This logic lives in
  `backend/app/services/pipedream_service.py` → `create_connect_token()`.

## Issue Fix: "about:blank" Redirect

The problem was that when the API returned an error (e.g., missing credentials), the frontend was trying to open `undefined` in a popup, resulting in a blank page.

**Fixed by:**
- Checking for error responses before accessing `connect_url`
- Validating `connect_url` exists and is not empty
- Checking if popup window opened successfully
- Throwing descriptive errors to the user

## What You Need to Do

### 1. Get Pipedream Credentials
1. Go to https://pipedream.com and sign in (create account if needed)
2. Create a new project or select an existing one
3. Go to **Project Settings** → **OAuth**
4. Generate or copy your **Client ID** and **Client Secret**
5. Note your **Project ID** from the project URL (format: `proj_xxxxx`)

### 2. Update `.env` File
Replace the placeholder values in `backend/.env`:

```env
PIPEDREAM_CLIENT_ID=your_actual_client_id_here
PIPEDREAM_CLIENT_SECRET=your_actual_client_secret_here
PIPEDREAM_PROJECT_ID=proj_nasK5GG  # Keep your existing project ID
```

### 3. Verify YouTube App is Configured in Pipedream
1. In your Pipedream project, make sure the **Google YouTube** app is available
2. The app slug should be `google_youtube` (this is set in the code)
3. Verify the project has the YouTube OAuth scope configured

### 4. Test the Flow
1. Restart the backend (it will automatically reload)
2. Go to Playlist feature in the UI
3. Enter a topic and duration
4. Click "Generate Roadmap"
5. After roadmap loads, click "Confirm"
6. When prompted, click "Connect YouTube Account"
7. You should see a Pipedream Connect popup (not a blank page)
8. Complete the OAuth flow

## How It Works Now

### Without Proper Credentials
- User clicks "Connect YouTube"
- Backend tries to get Pipedream token
- Detects placeholder credentials
- Returns clear error: "Pipedream credentials not configured..."
- Frontend shows error in UI instead of blank page

### With Proper Credentials
- User clicks "Connect YouTube"
- Backend exchanges credentials for Pipedream token
- Creates a connect token via Pipedream API
- Returns short-lived `connect_url`
- Frontend opens URL in popup
- User completes OAuth in Pipedream
- Frontend polls connection status
- Once connected, begins playlist generation

## API Endpoints Used

- **Backend**: `POST /playlist/connect-token`
  - Request: `{ "external_user_id": "user_id" }`
  - Response: `{ "connect_url": "https://..." }`

- **Pipedream API**:
  - Token: `POST https://api.pipedream.com/v1/oauth/token`
  - Connect Token: `POST https://api.pipedream.com/v1/connect/{PROJECT_ID}/tokens`

## Troubleshooting

### Error: "Pipedream credentials not configured"
- Check `.env` file has real credentials (not placeholders)
- Restart backend after changing `.env`

### Error: "Failed to create connect token"
- Verify credentials are correct in Pipedream dashboard
- Check network connectivity
- Review backend logs for details

### Popup not opening
- Check browser popup blocker settings
- Try allowing popups for localhost:3000

### Popup opens but shows error
- It's a Pipedream error, usually due to:
  - Wrong Project ID
  - Missing YouTube app in project
  - App scopes not configured correctly

## Next Steps

Once credentials are working, you can:
1. Implement `get_connected_account()` to check existing connections
2. Implement `create_playlist()` to actually create playlists
3. Implement `add_playlist_item()` to add videos to playlists
