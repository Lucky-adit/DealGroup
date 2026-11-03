# DealGroup mobile (iPhone + Android)

Expo / React Native app with the same features as the website: buyer, seller and admin. English and Hindi, light and dark,
phone and tablet layouts. It shares pricing, business rules, translations and the data layer with the website through `../lib`
(imported as `@shared/...`, see `metro.config.js`).

## Run on your phone

```bash
cd mobile
npm install
npx expo start          # scan the QR code with the Expo Go app (iOS/Android)
```

With no keys set it runs in **demo mode** (in-memory sample data; pick buyer, seller or admin at sign-in).
To use the real backend, copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
(the same Supabase project as the website).

## Build for the App Store and Google Play

Builds run in the cloud with EAS, so no Mac is needed for the iPhone build.

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview   # installable APK for testing
npx eas-cli@latest build --platform all --profile production    # store builds
npx eas-cli@latest submit --platform all                         # upload to the stores
```

You need an Apple Developer account and a Google Play Console account. Bundle id / package: `com.dealgroup.app`
(change in `app.json` before the first store build).

## Checks

```bash
npm run typecheck
npx expo export --platform android --platform ios --platform web
```
