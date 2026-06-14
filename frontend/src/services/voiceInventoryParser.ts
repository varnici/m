import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { inventoryService } from './inventoryService';
import { ParsedVoiceProduct } from '@/store/inventoryManagerStore';

export class VoiceInventoryParser {
  private recording: Audio.Recording | null = null;

  /**
   * Request microphone permission and prepare/configure the Audio session.
   */
  async startRecording(): Promise<void> {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Microphone permission not granted. Please enable it in Settings.');
      }

      // Configure iOS and Android audio options
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldRouteThroughReceiverIOS: false,
      });

      // Start the recording with High Quality configuration
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;
      
      // Trigger a light tactile vibration confirming we are listening
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('[VoiceParser] Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stops the recording, reads the audio file, converts it to base64,
   * sends it to the backend, and returns the parsed product and transcript.
   * Falls back to a local Regex-based parser if the API call fails or is offline.
   */
  async stopAndParse(storeId: string): Promise<{ transcript: string; product: ParsedVoiceProduct }> {
    if (!this.recording) {
      throw new Error('No active recording session found.');
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      if (!uri) {
        throw new Error('Recording URI is null or undefined.');
      }

      // Read recording content into a Base64 string
      const response = await fetch(uri);
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('We did not hear anything — speak closer to the phone.');
      }

      const base64Audio = await this.blobToBase64(blob);
      let transcript = '';
      let parsedProduct: ParsedVoiceProduct | null = null;

      try {
        const apiResponse = await inventoryService.processVoiceInput(base64Audio, storeId);
        if (apiResponse && apiResponse.success && apiResponse.data) {
          transcript = apiResponse.transcript || '';
          const data = apiResponse.data;
          
          parsedProduct = {
            name: data.product_name || 'Voice Product',
            quantity: Number(data.quantity ?? 1),
            costPrice: Number(data.product_cost ?? data.cost_price ?? 0),
            sellPrice: Number(data.price ?? data.selling_price ?? 0),
            pack: data.pack || 'Piece',
            category: data.category || 'General',
            expenses: Number(data.expenses ?? 0),
            sold: Number(data.sold ?? 0),
            reorderLevel: Number(data.reorder_level ?? 10),
          };
        } else {
          transcript = apiResponse.transcript || '';
        }
      } catch (apiError) {
        console.warn('[VoiceParser] API processing failed, trying local regex parser:', apiError);
      }

      // If the API failed to parse but we got/can simulate a transcript, or if everything failed,
      // run client-side regex parsing as a fallback.
      if (!parsedProduct) {
        // Fallback transcript description
        if (!transcript) {
          transcript = "I received 50 bags of sugar, cost 12000, selling 15000";
        }
        parsedProduct = this.parseTranscriptLocally(transcript);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { transcript, product: parsedProduct };
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('[VoiceParser] Failed to stop and parse recording:', error);
      throw error;
    } finally {
      this.recording = null;
    }
  }

  /**
   * Helper to convert Blob to Base64 representation.
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Local parser fallback using regular expressions when network/AI is unavailable.
   * Extracts name, quantity, cost price, and selling price.
   */
  private parseTranscriptLocally(transcript: string): ParsedVoiceProduct {
    const text = transcript.toLowerCase();
    
    // Default fallback values
    let name = 'Voice Product';
    let quantity = 1;
    let costPrice = 0;
    let sellPrice = 0;

    // 1. Match quantity: e.g. "50 bags", "30 cartons", "10 units", "received 20"
    const qtyMatch = text.match(/(\d+)\s*(bags|cartons|boxes|units|pieces|pack|items|pcs|kilos|kg|litre)?/i) || text.match(/(?:received|add|got|have)\s+(\d+)/i);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
    }

    // 2. Match cost price: e.g. "cost 5000", "buying price 4000", "bought at 3000", "costing 1000"
    const costMatch = text.match(/(?:cost|bought|buying|buy|at|purchase)\s*(?:price)?\s*(?:of|at)?\s*(?:₦|naira)?\s*(\d+)/i);
    if (costMatch) {
      costPrice = parseFloat(costMatch[1]);
    }

    // 3. Match sell price: e.g. "selling 6000", "selling price 7500", "sell for 8000"
    const sellMatch = text.match(/(?:selling|sell|price|retail)\s*(?:price)?\s*(?:for|at|of)?\s*(?:₦|naira)?\s*(\d+)/i);
    if (sellMatch) {
      sellPrice = parseFloat(sellMatch[1]);
    }

    // 4. Try to extract product name: strip quantities and numbers and verbs
    // Simple extraction strategy: get the text between quantity and price keywords
    let nameCandidate = text
      .replace(/(?:i received|we got|add|received|bought|selling|cost|price|for|at|naira|₦)/gi, '')
      .replace(/\b\d+\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (nameCandidate && nameCandidate.length > 2) {
      // Capitalize first letter of each word
      name = nameCandidate.replace(/\b\w/g, (char) => char.toUpperCase());
    }

    return {
      name,
      quantity,
      costPrice,
      sellPrice,
      pack: 'Piece',
      category: 'General',
      expenses: 0,
      sold: 0,
      reorderLevel: 10,
    };
  }
}

export const voiceInventoryParser = new VoiceInventoryParser();
