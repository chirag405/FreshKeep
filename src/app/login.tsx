import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';

export default function Login() {
  const router = useRouter();
  const sendPhoneOtp = useAuthStore((s) => s.sendPhoneOtp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [phone, setPhone] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [signingInGoogle, setSigningInGoogle] = useState(false);

  const onSendCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) {
      Alert.alert('Enter a valid number', 'Include your country code, e.g. 91 98765 43210.');
      return;
    }
    setSendingCode(true);
    const { error } = await sendPhoneOtp(`+${digits}`);
    setSendingCode(false);
    if (error) {
      Alert.alert('Could not send code', error);
      return;
    }
    router.push({ pathname: '/verify', params: { phone: `+${digits}` } });
  };

  const onGoogle = async () => {
    setSigningInGoogle(true);
    const { error } = await signInWithGoogle();
    setSigningInGoogle(false);
    if (error) {
      Alert.alert('Google sign-in failed', error);
      return;
    }
    router.replace('/');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.heroWrap}>
        <View style={styles.logo}><Text style={{ fontSize: 32 }}>🌱</Text></View>
        <Text style={styles.title}>Welcome to FreshKeep</Text>
        <Text style={styles.subtitle}>Sign in to save your list and{'\n'}sync across devices</Text>
      </View>
      <View style={{ flex: 1 }} />
      <Text style={styles.fieldLabel}>MOBILE NUMBER (WITH COUNTRY CODE)</Text>
      <View style={styles.phoneRow}>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="91 98765 43210"
          placeholderTextColor="rgba(255,255,255,0.35)"
          keyboardType="phone-pad"
          style={styles.phoneInput}
        />
      </View>
      <Pressable style={styles.sendCodeButton} onPress={onSendCode} disabled={sendingCode}>
        {sendingCode ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendCodeText}>Send code</Text>}
      </Pressable>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
      <Pressable style={styles.googleButton} onPress={onGoogle} disabled={signingInGoogle}>
        {signingInGoogle ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.googleText}>Continue with Google</Text>}
      </Pressable>
      <Text style={styles.terms}>
        By continuing you agree to our Terms.{'\n'}Prefer no account? <Text style={styles.termsLink} onPress={() => router.back()}>Use device lock instead</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07120E', paddingHorizontal: 26 },
  heroWrap: { paddingTop: 96, alignItems: 'center' },
  logo: { width: 72, height: 72, borderRadius: 22, backgroundColor: '#12613F', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 25, fontWeight: '800', letterSpacing: -0.5, marginTop: 18 },
  subtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 15, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  fieldLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11.5, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  phoneInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16, fontSize: 17, color: '#fff' },
  sendCodeButton: { backgroundColor: colors.primary, borderRadius: 15, paddingVertical: 16, alignItems: 'center', marginTop: 14 },
  sendCodeText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  dividerText: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  googleButton: { backgroundColor: '#fff', borderRadius: 15, paddingVertical: 15, alignItems: 'center' },
  googleText: { fontSize: 16, fontWeight: '600', color: '#1F1F1F' },
  terms: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 22, marginBottom: 40, lineHeight: 18 },
  termsLink: { color: '#7FDCB6', fontWeight: '600' },
});
