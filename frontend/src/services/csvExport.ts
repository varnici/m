import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';

/**
 * Writes CSV text to a cache file and opens the native share sheet — the
 * app's first export feature, so this is the one shared place the
 * write-then-share pattern lives.
 */
export async function shareCsv(csvContent: string, filename: string) {
  try {
    const uri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(uri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Toast.show({ type: 'error', text1: 'Sharing is not available on this device' });
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      dialogTitle: filename,
      UTI: 'public.comma-separated-values-text',
    });
  } catch (err: any) {
    Toast.show({ type: 'error', text1: 'Could not export CSV', text2: err.message });
  }
}
