// Global test setup.

// Dummy values so modules that read these at import time (src/lib/supabaseClient.ts)
// don't log a "not configured" warning during every test run — real values come
// from .env.local when the app actually runs, this only affects Jest.
process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

// Native module — has no JS implementation to run under Jest's Node
// environment, so tests that transitively import it (via supabaseClient ->
// authStore -> repositories -> stores) need the community-maintained mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

export {};
