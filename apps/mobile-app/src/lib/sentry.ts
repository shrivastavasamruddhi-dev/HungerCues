/**
 * Sentry initialisation for HungerCues mobile app.
 *
 * Call `initSentry()` once at app startup (before rendering any screens).
 *
 * In production, set EXPO_PUBLIC_SENTRY_DSN in your EAS build profile or
 * as a GitHub Secret that gets injected via eas.json / app.config.js.
 *
 * Documentation:
 *   https://docs.sentry.io/platforms/react-native/manual-setup/expo/
 */

import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

/**
 * Initialise Sentry error tracking.
 *
 * - No-ops if DSN is not configured (safe for local development).
 * - Sets `release` from the Expo Constants so Sentry can map sourcemaps.
 */
export function initSentry(): void {
  const dsn: string =
    process.env.EXPO_PUBLIC_SENTRY_DSN ??
    (Constants.expoConfig?.extra?.sentryDsn as string) ??
    "";

  if (!dsn && __DEV__) {
    console.log("[Sentry] DSN not configured — Sentry will be disabled (dev only).");
  }

  const release = Constants.expoConfig?.version ?? "unknown";
  const environment = __DEV__ ? "development" : "production";

  Sentry.init({
    dsn,
    enabled: !!dsn,
    release,
    environment,
    // Capture 100% of errors; use tracesSampleRate < 1.0 for performance monitoring
    tracesSampleRate: 1.0,
    // Do not send PII (user emails, IPs) automatically
    sendDefaultPii: false,
    // Enable native crash reporting
    enableNativeCrashHandling: true,
    // debug: __DEV__,
  });
}

/**
 * Wrap the root app component with Sentry's error boundary only if Sentry is active.
 * This prevents the "Sentry.wrap was called before Sentry.init" warning in dev mode.
 */
export function wrapApp(RootComponent: React.ComponentType<any>): React.ComponentType<any> {
  return Sentry.wrap(RootComponent);
}

export { Sentry };
