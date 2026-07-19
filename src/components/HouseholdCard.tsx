import { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, radii, shadow } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';
import { useHouseholdStore } from '@/store/householdStore';

const FREE_CAP = 3;
const PREMIUM_CAP = 10;

/**
 * The Settings "HOUSEHOLD" card: create a household, see members, invite by
 * phone/email (Splitwise-style — the invite is a `freshkeep://join/<token>`
 * link sent through the OS share sheet, so we never pay for SMS), and leave.
 */
export function HouseholdCard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isPremium = useAuthStore((s) => s.isPremium);
  const household = useHouseholdStore((s) => s.household);
  const members = useHouseholdStore((s) => s.members);
  const createHousehold = useHouseholdStore((s) => s.createHousehold);
  const createInvite = useHouseholdStore((s) => s.createInvite);
  const leave = useHouseholdStore((s) => s.leave);

  const [busy, setBusy] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [contact, setContact] = useState('');

  const cap = isPremium ? PREMIUM_CAP : FREE_CAP;

  if (!user) {
    return (
      <View style={styles.card}>
        <Text style={styles.rowTitle}>👨‍👩‍👧  Share with your household</Text>
        <Text style={styles.rowSubtitle}>
          Sign in to share one list with up to {FREE_CAP} people — everyone sees the same items, live.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/login')}>
          <Text style={styles.primaryButtonText}>Sign in to get started</Text>
        </Pressable>
      </View>
    );
  }

  if (!household) {
    const onCreate = async () => {
      setBusy(true);
      const { error } = await createHousehold('My household');
      setBusy(false);
      if (error) Alert.alert("Couldn't create household", error);
    };
    return (
      <View style={styles.card}>
        <Text style={styles.rowTitle}>👨‍👩‍👧  Share with your household</Text>
        <Text style={styles.rowSubtitle}>
          One shared list for your home — up to {FREE_CAP} people free{isPremium ? '' : `, ${PREMIUM_CAP} on Premium`}. Invite by
          phone number or email.
        </Text>
        <Pressable style={styles.primaryButton} onPress={onCreate} disabled={busy}>
          <Text style={styles.primaryButtonText}>{busy ? 'Creating…' : 'Create a household'}</Text>
        </Pressable>
      </View>
    );
  }

  const onSendInvite = async () => {
    setBusy(true);
    const { url, error } = await createInvite(contact.trim());
    setBusy(false);
    if (error || !url) {
      Alert.alert("Couldn't create invite", error ?? 'Try again.');
      return;
    }
    setInviting(false);
    setContact('');
    await Share.share({
      message: `Join my FreshKeep household — we'll share one list of what's expiring and what's due. Open this on your phone after installing FreshKeep: ${url}`,
    });
  };

  const onLeave = () => {
    Alert.alert('Leave household', 'Your copies of shared items stay on this device, but they stop syncing with the household.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          const { error } = await leave();
          if (error) Alert.alert("Couldn't leave", error);
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.rowTitle}>👨‍👩‍👧  {household.name}</Text>
        <Text style={styles.count}>{members.length}/{cap}</Text>
      </View>

      {members.map((m) => (
        <View key={m.user_id} style={styles.memberRow}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberAvatarText}>{(m.display_name || 'M')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.memberName} numberOfLines={1}>
            {m.user_id === user.id ? 'You' : m.display_name}
          </Text>
          {m.role === 'owner' && <Text style={styles.ownerBadge}>OWNER</Text>}
        </View>
      ))}

      {inviting ? (
        <>
          <TextInput
            value={contact}
            onChangeText={setContact}
            placeholder="Phone number or email"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.contactInput}
          />
          <View style={styles.inviteActions}>
            <Pressable style={[styles.primaryButton, { flex: 1, marginTop: 0 }]} onPress={onSendInvite} disabled={busy}>
              <Text style={styles.primaryButtonText}>{busy ? 'Creating…' : 'Share invite link'}</Text>
            </Pressable>
            <Text style={styles.cancelLink} onPress={() => setInviting(false)}>Cancel</Text>
          </View>
        </>
      ) : (
        <View style={styles.footerRow}>
          {members.length < cap ? (
            <Text style={styles.inviteLink} onPress={() => setInviting(true)}>+ Invite someone</Text>
          ) : (
            <Text style={styles.rowSubtitle}>Household is full{isPremium ? '' : ' — Premium raises the limit to 10'}</Text>
          )}
          <Text style={styles.leaveLink} onPress={onLeave}>Leave</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radii.md + 4, padding: 16, ...shadow.card },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  rowSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  count: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  memberAvatar: { width: 32, height: 32, borderRadius: 999, backgroundColor: colors.iconTileBlue, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  memberName: { flex: 1, fontSize: 15, color: colors.textPrimary },
  ownerBadge: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: colors.goldText, backgroundColor: colors.gold, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6, overflow: 'hidden' },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  contactInput: { backgroundColor: colors.screenBg, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.textPrimary, marginTop: 14 },
  inviteActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  cancelLink: { fontSize: 14, color: colors.textMuted },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  inviteLink: { fontSize: 14, fontWeight: '700', color: colors.primary },
  leaveLink: { fontSize: 14, fontWeight: '600', color: colors.dangerText },
});
