import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'freshkeep.onboardingSeen';

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return true; // fail open — never trap a user in onboarding due to a storage error
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // best-effort; worst case onboarding shows again next launch
  }
}
