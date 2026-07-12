import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';

const CODE_LENGTH = 6;

export default function Verify() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const verifyPhoneOtp = useAuthStore((s) => s.verifyPhoneOtp);
  const sendPhoneOtp = useAuthStore((s) => s.sendPhoneOtp);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const onVerify = async (fullCode: string) => {
    if (fullCode.length !== CODE_LENGTH) return;
    setVerifying(true);
    const { error } = await verifyPhoneOtp(phone, fullCode);
    setVerifying(false);
    if (error) {
      Alert.alert('Invalid code', error);
      setCode('');
      return;
    }
    router.replace('/');
  };

  const onChangeCode = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) onVerify(digits);
  };

  return (
    <View style={styles.screen}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backArrow}>‹</Text>
      </Pressable>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}<Text style={styles.phoneText}>{phone}</Text> ·{' '}
          <Text style={styles.changeLink} onPress={() => router.back()}>Change</Text>
        </Text>
      </View>

      <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
        {Array.from({ length: CODE_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.otpBox, i === code.length && styles.otpBoxActive]}>
            <Text style={styles.otpDigit}>{code[i] ?? ''}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={onChangeCode}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        style={styles.hiddenInput}
        autoFocus
      />

      <Text style={styles.resendLink} onPress={() => sendPhoneOtp(phone)}>Resend code</Text>

      <View style={{ flex: 1 }} />
      <Pressable style={styles.verifyButton} onPress={() => onVerify(code)} disabled={verifying}>
        {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyText}>Verify &amp; continue</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07120E', paddingHorizontal: 26, paddingTop: 62 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: '#fff', fontSize: 22 },
  headerBlock: { marginTop: 44 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 15, marginTop: 8, lineHeight: 20 },
  phoneText: { color: '#fff', fontWeight: '600' },
  changeLink: { color: '#7FDCB6' },
  otpRow: { flexDirection: 'row', gap: 9, marginTop: 34 },
  otpBox: { flex: 1, aspectRatio: 1 / 1.15, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  otpBoxActive: { borderColor: '#2FBB84', backgroundColor: 'rgba(47,187,132,0.14)' },
  otpDigit: { color: '#fff', fontSize: 26, fontWeight: '700' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  resendLink: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 20, textAlign: 'center' },
  verifyButton: { backgroundColor: colors.primary, borderRadius: 15, paddingVertical: 16, alignItems: 'center', marginBottom: 40 },
  verifyText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
