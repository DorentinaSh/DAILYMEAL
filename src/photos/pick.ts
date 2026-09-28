/**
 * Getting a photo from the person using the app.
 *
 * Cancelling and being refused permission are reported separately. They are both
 * ordinary answers rather than errors, but they need different replies: saying
 * nothing after a cancel is right, and saying nothing after a refusal looks like
 * a broken button. Nothing here writes a file — the caller copies the cache URI
 * somewhere durable.
 */
import * as ImagePicker from 'expo-image-picker';

export type PickResult =
  | { kind: 'picked'; uri: string }
  | { kind: 'cancelled' }
  | { kind: 'denied' };

/** Square, because every mark is a square, and small, because it is drawn at 44. */
const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

function toResult(result: ImagePicker.ImagePickerResult): PickResult {
  if (result.canceled) return { kind: 'cancelled' };
  const uri = result.assets[0]?.uri;
  return uri ? { kind: 'picked', uri } : { kind: 'cancelled' };
}

export async function takePhoto(): Promise<PickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { kind: 'denied' };
  return toResult(await ImagePicker.launchCameraAsync(OPTIONS));
}

export async function chooseFromLibrary(): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { kind: 'denied' };
  return toResult(await ImagePicker.launchImageLibraryAsync(OPTIONS));
}
