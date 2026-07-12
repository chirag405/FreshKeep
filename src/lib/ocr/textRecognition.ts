import TextRecognition from '@react-native-ml-kit/text-recognition';

/**
 * The only file that touches the native ML Kit module — isolated so
 * src/lib/ocr/dateParser.ts (the actual date-extraction logic) stays a pure
 * function testable under Jest without mocking native code.
 *
 * Requires a custom dev client (EAS Build) — does not run in Expo Go.
 */
export async function recognizeText(photoUri: string): Promise<string> {
  const result = await TextRecognition.recognize(photoUri);
  return result.text;
}
