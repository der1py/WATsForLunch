# WATsForLunch

Serving as the intelligent decision layer between you and your next meal, this app connects University of Waterloo students with healthy meal options tailored to their location, travel time, allergies, and preferences.

## Key features

- Building-based lunch recommendations with travel-time limits
- Dietary, allergen, and health-preference filtering
- Available for web, iOS, and Android via Expo

## Install

```bash
npm install
```

## Set up environment variables

Copy `.env.example` to `.env`, then add a Google Maps API key and OpenAI API key:

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
OPENAI_API_KEY="your-open-ai-api-key"
```

The key must be enabled for the Google Routes API and Google Maps Embed API.

## Run

```bash
npm run start
```

## Use Expo Go on your phone

1. Install **Expo Go** on your iOS or Android phone.
2. Start the app and scan the QR code shown in the terminal with Expo Go:

   ```bash
   npm run start
   ```

If your phone cannot connect over your local network, start Expo with a tunnel instead:

```bash
npx expo start --tunnel
```
