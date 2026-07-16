import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [signingInGoogle, setSigningInGoogle] = useState(false);

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
      <View style={[styles.heroWrap, { paddingTop: insets.top + 56 }]}>
        <View style={styles.logo}><Text style={{ fontSize: 32 }}>🌱</Text></View>
        <Text style={styles.title}>Welcome to FreshKeep</Text>
        <Text style={styles.subtitle}>Sign in to save your list and{'\n'}sync across devices</Text>
      </View>
      <View style={{ flex: 1 }} />
      <Pressable style={styles.googleButton} onPress={onGoogle} disabled={signingInGoogle}>
        {signingInGoogle ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.googleText}>Continue with Google</Text>}
      </Pressable>
      <Text style={[styles.terms, { marginBottom: insets.bottom + 24 }]}>
        By continuing you agree to our Terms.{'\n'}Prefer no account? <Text style={styles.termsLink} onPress={() => router.back()}>Use device lock instead</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07120E', paddingHorizontal: 26 },
  heroWrap: { alignItems: 'center' },
  logo: { width: 72, height: 72, borderRadius: 22, backgroundColor: '#12613F', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 25, fontWeight: '800', letterSpacing: -0.5, marginTop: 18 },
  subtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 15, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  googleButton: { backgroundColor: '#fff', borderRadius: 15, paddingVertical: 15, alignItems: 'center' },
  googleText: { fontSize: 16, fontWeight: '600', color: '#1F1F1F' },
  terms: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 22, lineHeight: 18 },
  termsLink: { color: '#7FDCB6', fontWeight: '600' },
});
