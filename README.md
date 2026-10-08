# Webhook Manager

Frontend test task built with React, TypeScript strict mode, Vite, and MSW. MSW simulates the API entirely in memory in both local and deployed demo builds.

The API client validates successful responses and API error bodies at runtime with Zod. Run the project with Node.js 22.12 or newer.

## Run locally

```sh
npm install
npm run dev
```

Run the API client tests with `npm test`.
Format the source with `npm run format` and check formatting with `npm run format:check`.

## Structure

- `src/api` contains the HTTP client and its concurrency test.
- `src/hooks` owns authentication, webhook list, and editor state.
- `src/components` contains the login, list, and editor UI.
- `src/mocks` contains the in-memory MSW API.

## Test account

- Email: `admin@example.com`
- Password: `Password123!`

## Authentication behavior

- A device fingerprint (32 lowercase hexadecimal characters) is created once and kept in `localStorage`.
- The device session token exists only while exchanging it for a session. The mock holds the active session in memory for 30 seconds.
- Protected requests share one in-flight token rotation after a 401 and retry once. A failed rotation ends the local session.
- Reloading the page can require signing in again because the mock session is memory-only.

## Key implementation decisions

- React with strict TypeScript keeps UI components and request data contracts explicit.
- MSW provides a self-contained in-memory API, so the hosted preview works without a backend.
- Zod validates API responses at runtime; invalid payloads are treated as contract errors.
- Search and pagination are reflected in the URL, so list state can be refreshed or shared.
- Concurrent 401 responses share one token rotation, and each failed request retries only once.

## Scope and known limitations

The authentication flow, in-memory API mock, webhook list with URL-backed pagination and search, and webhook editing are implemented.
