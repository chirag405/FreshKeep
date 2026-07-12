import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { colors, radii } from '@/theme/tokens';
import { formatDate } from '@/lib/dateMath';
import { recognizeText } from '@/lib/ocr/textRecognition';
import { extractDateCandidates, type DateCandidate } from '@/lib/ocr/dateParser';
import { emitDateScanned } from '@/lib/ocr/scanResultChannel';

export default function Scan() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [processing, setProcessing] = useState(false);
  const [candidates, setCandidates] = useState<DateCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const capture = async () => {
    if (!cameraRef.current) return;
    setProcessing(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (!photo?.uri) throw new Error('No photo captured');
      const text = await recognizeText(photo.uri);
      const found = extractDateCandidates(text);
      if (found.length === 0) {
        setError("Couldn't find a date on that label — try again or enter it manually.");
      } else {
        setCandidates(found);
      }
    } catch {
      setError('Scanning failed. Try again, or enter the date manually.');
    } finally {
      setProcessing(false);
    }
  };

  const selectCandidate = (candidate: DateCandidate) => {
    emitDateScanned(candidate.iso);
    router.back();
  };

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.permissionText}>FreshKeep needs camera access to scan expiry dates.</Text>
        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Allow camera</Text>
        </Pressable>
        <Text style={styles.manualLink} onPress={() => router.back()}>Enter manually instead</Text>
      </View>
    );
  }

  if (candidates) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.resultTitle}>Which date is it?</Text>
        {candidates.map((c) => (
          <Pressable key={c.iso} style={styles.candidateCard} onPress={() => selectCandidate(c)}>
            <Text style={styles.candidateDate}>{formatDate(c.iso)}</Text>
            <Text style={styles.candidateRaw}>found: &quot;{c.raw}&quot;{c.confidence === 'low' ? ' · double-check this one' : ''}</Text>
          </Pressable>
        ))}
        <Text style={styles.manualLink} onPress={() => setCandidates(null)}>Retake photo</Text>
        <Text style={styles.manualLink} onPress={() => router.back()}>Enter manually instead</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, styles.cameraScreen]}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <View style={styles.overlay}>
        <Text style={styles.hint}>Point at the printed expiry date</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <View style={styles.controlsRow}>
          <Text style={styles.manualLinkLight} onPress={() => router.back()}>Cancel</Text>
          <Pressable style={styles.shutter} onPress={capture} disabled={processing}>
            {processing ? <ActivityIndicator color="#fff" /> : <View style={styles.shutterInner} />}
          </Pressable>
          <View style={{ width: 60 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  cameraScreen: { backgroundColor: '#000' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  permissionText: { color: colors.textPrimary, fontSize: 16, textAlign: 'center' },
  primaryButton: { backgroundColor: colors.primary, borderRadius: radii.lg, paddingVertical: 14, paddingHorizontal: 28 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  manualLink: { color: colors.primary, fontSize: 15, fontWeight: '600', marginTop: 8 },
  manualLinkLight: { color: '#fff', fontSize: 16, width: 60 },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: 50, paddingHorizontal: 24, alignItems: 'center', gap: 14 },
  hint: { color: '#fff', fontSize: 15, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999 },
  errorText: { color: '#FBEAE8', fontSize: 13, textAlign: 'center', backgroundColor: 'rgba(224,72,61,0.4)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  shutter: { width: 72, height: 72, borderRadius: 999, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 999, backgroundColor: '#fff' },
  resultTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  candidateCard: { backgroundColor: colors.card, borderRadius: radii.md + 2, padding: 16, width: '100%' },
  candidateDate: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  candidateRaw: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
