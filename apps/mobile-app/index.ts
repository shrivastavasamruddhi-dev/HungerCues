import { registerRootComponent } from 'expo';

import App from './App';
import { initSentry, wrapApp } from './src/lib/sentry';

// Initialise Sentry before any component mounts
initSentry();

// Wrap App with Sentry error boundary if configured
const SentryApp = wrapApp(App);

// registerRootComponent calls AppRegistry.registerComponent('main', () => SentryApp);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(SentryApp);

