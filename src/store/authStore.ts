import { create } from 'zustand';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';

import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { pullAndMergeAll } from '@/sync';

WebBrowser.maybeCompleteAuthSession();

type AuthResult = { error?: string };

type AuthState = {
  initialized: boolean;
  session: Session | null;
  user: User | null;
  isPremium: boolean;
  init: () => Promise<void>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
  subscribeToPremiumChanges: () => () => void;
};

async function fetchIsPremium(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('is_premium').eq('user_id', userId).maybeSingle();
  if (error || !data) return false;
  return Boolean(data.is_premium);
}

/**
 * Applies a freshly-read `isPremium` value and, on the false → true edge
 * specifically, kicks off a sync so everything the user built up on the free
 * (local-only) tier gets pushed to Supabase the moment they upgrade — not
 * only on the next app boot or manual "Sync now" tap. `pullAndMergeAll`
 * already uploads any local row missing from Supabase, so nothing further
 * is needed here beyond firing it at the right time.
 */
function applyPremiumStatus(
  set: (partial: Partial<AuthState>) => void,
  get: () => AuthState,
  isPremium: boolean,
): void {
  const wasPremium = get().isPremium;
  set({ isPremium });
  if (isPremium && !wasPremium) {
    pullAndMergeAll();
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  session: null,
  user: null,
  isPremium: false,

  init: async () => {
    if (!isSupabaseConfigured) {
      set({ initialized: true });
      return;
    }
    const { data } = await supabase.auth.getSession();
    const session = data.session ?? null;
    set({ session, user: session?.user ?? null, initialized: true });
    if (session?.user) {
      applyPremiumStatus(set, get, await fetchIsPremium(session.user.id));
    }

    supabase.auth.onAuthStateChange((_event, newSession) => {
      set({ session: newSession, user: newSession?.user ?? null });
      if (newSession?.user) {
        fetchIsPremium(newSession.user.id).then((isPremium) => applyPremiumStatus(set, get, isPremium));
      } else {
        set({ isPremium: false });
      }
    });
  },

  signInWithGoogle: async () => {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured — see supabase/README.md' };
    const redirectTo = AuthSession.makeRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) return { error: error?.message ?? 'Failed to start Google sign-in' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) return { error: 'Google sign-in was cancelled' };

    const params = new URL(result.url.replace('#', '?')).searchParams;
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return { error: 'Missing tokens in Google sign-in redirect' };

    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
    return sessionError ? { error: sessionError.message } : {};
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, isPremium: false });
  },

  refreshPremiumStatus: async () => {
    const user = get().user;
    if (!user) return;
    applyPremiumStatus(set, get, await fetchIsPremium(user.id));
  },

  /**
   * Live-updates `isPremium` the moment the LemonSqueezy webhook writes to
   * this user's profile row (see supabase/functions/lemonsqueezy-webhook),
   * so the paywall flips to "You're already on Premium" without the user
   * needing to background/foreground the app. Returns an unsubscribe
   * function; no-op (returns a no-op unsubscribe) if not signed in.
   */
  subscribeToPremiumChanges: () => {
    const user = get().user;
    if (!user) return () => {};
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
        (payload) => applyPremiumStatus(set, get, Boolean((payload.new as { is_premium?: boolean }).is_premium)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
