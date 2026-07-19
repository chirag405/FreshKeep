import { create } from 'zustand';

import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { useExpiryStore } from '@/store/expiryStore';
import { useLastTimeStore } from '@/store/lastTimeStore';
import { pullAndMergeAll } from '@/sync';

export type Household = { id: string; name: string; owner_id: string };
export type HouseholdMember = { user_id: string; display_name: string; role: 'owner' | 'member'; joined_at: string };

type HouseholdState = {
  loaded: boolean;
  household: Household | null;
  members: HouseholdMember[];
  refresh: () => Promise<void>;
  createHousehold: (name: string) => Promise<{ error?: string }>;
  createInvite: (contact: string) => Promise<{ url?: string; error?: string }>;
  redeemInvite: (token: string) => Promise<{ error?: string }>;
  leave: () => Promise<{ error?: string }>;
  memberName: (userId: string | null) => string | null;
  reset: () => void;
};

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let realtimeDebounce: ReturnType<typeof setTimeout> | null = null;

function stopRealtime(): void {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

/**
 * Live multiplayer: when any member writes to the household's items in
 * Supabase, re-run the sync merge and rehydrate the visible lists. Debounced
 * because one action often touches several rows (e.g. a full sync push from
 * another device firing many change events at once).
 */
function startRealtime(householdId: string): void {
  stopRealtime();
  const onChange = () => {
    if (realtimeDebounce) clearTimeout(realtimeDebounce);
    realtimeDebounce = setTimeout(async () => {
      await pullAndMergeAll();
      await useExpiryStore.getState().hydrate();
      await useLastTimeStore.getState().hydrate();
    }, 400);
  };
  realtimeChannel = supabase
    .channel(`household-${householdId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expiry_items', filter: `household_id=eq.${householdId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'last_time_tasks', filter: `household_id=eq.${householdId}` }, onChange)
    .subscribe();
}

/** Postgres `raise exception 'x'` surfaces as an error message containing x. */
function friendlyError(message: string | undefined): string {
  const m = message ?? '';
  if (m.includes('already_in_household')) return "You're already in a household — leave it first.";
  if (m.includes('household_full')) return 'This household is full (3 members on the free plan, 10 on Premium).';
  if (m.includes('invite_invalid_or_expired')) return 'This invite link is invalid or has expired.';
  if (m.includes('not_signed_in')) return 'Sign in first.';
  if (m.includes('not_a_member')) return "You're not a member of this household.";
  return m || 'Something went wrong.';
}

export const useHouseholdStore = create<HouseholdState>((set, get) => ({
  loaded: false,
  household: null,
  members: [],

  refresh: async () => {
    const user = useAuthStore.getState().user;
    if (!isSupabaseConfigured || !user) {
      stopRealtime();
      set({ loaded: true, household: null, members: [] });
      return;
    }
    try {
      const { data: membership, error } = await supabase
        .from('household_members')
        .select('household_id, households ( id, name, owner_id )')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;

      const household = (membership?.households ?? null) as Household | null;
      if (!household) {
        stopRealtime();
        set({ loaded: true, household: null, members: [] });
        return;
      }

      const { data: members, error: membersError } = await supabase.rpc('get_household_members', {
        p_household: household.id,
      });
      if (membersError) throw membersError;

      set({ loaded: true, household, members: (members ?? []) as HouseholdMember[] });
      startRealtime(household.id);
    } catch (error) {
      console.error('[household] refresh failed', error);
      set({ loaded: true });
    }
  },

  createHousehold: async (name) => {
    const { error } = await supabase.rpc('create_household', { p_name: name });
    if (error) return { error: friendlyError(error.message) };
    await get().refresh();
    return {};
  },

  createInvite: async (contact) => {
    const household = get().household;
    if (!household) return { error: 'No household to invite to.' };
    const { data, error } = await supabase.rpc('create_invite', {
      p_household: household.id,
      p_contact: contact,
    });
    if (error) return { error: friendlyError(error.message) };
    const token = (data as { token?: string } | null)?.token;
    if (!token) return { error: 'Invite could not be created.' };
    return { url: `freshkeep://join/${token}` };
  },

  redeemInvite: async (token) => {
    const { error } = await supabase.rpc('redeem_invite', { p_token: token });
    if (error) return { error: friendlyError(error.message) };
    await get().refresh();
    // First join: pull the household's existing items down immediately.
    await pullAndMergeAll();
    await useExpiryStore.getState().hydrate();
    await useLastTimeStore.getState().hydrate();
    return {};
  },

  leave: async () => {
    const household = get().household;
    if (!household) return {};
    const { error } = await supabase.rpc('leave_household', { p_household: household.id });
    if (error) return { error: friendlyError(error.message) };
    stopRealtime();
    set({ household: null, members: [] });
    return {};
  },

  memberName: (userId) => {
    if (!userId) return null;
    return get().members.find((m) => m.user_id === userId)?.display_name ?? null;
  },

  reset: () => {
    stopRealtime();
    set({ loaded: false, household: null, members: [] });
  },
}));
