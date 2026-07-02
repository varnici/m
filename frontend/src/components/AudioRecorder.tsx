import React, { useState } from 'react';
import { View, Button, Text, ActivityIndicator } from 'react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';

interface AudioRecorderProps {
  onRecordingFinished: (audioUri: string, audioBlob: Blob) => void;
}

export default function AudioRecorder({ onRecordingFinished }: AudioRecorderProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startRecording = async () => {
    setError(null);
    try {
      setLoading(true);
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) throw new Error('Microphone permission not granted');
      await setAudioModeAsync({ playsInSilentMode: true });
      recorder.record();
      setIsRecording(true);
    } catch (e) {
      setError('Failed to start recording');
    } finally {
      setLoading(false);
    }
  };

  const stopRecording = async () => {
    setLoading(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('No audio URI');
      const response = await fetch(uri);
      const blob = await response.blob();
      onRecordingFinished(uri, blob);
    } catch (e) {
      setError('Failed to stop recording');
    } finally {
      setIsRecording(false);
      setLoading(false);
    }
  };

  return (
    <View style={{ marginVertical: 8 }}>
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      {loading && <ActivityIndicator />}
      {!isRecording ? (
        <Button title="Start Recording" onPress={startRecording} disabled={loading} />
      ) : (
        <Button title="Stop Recording" onPress={stopRecording} disabled={loading} />
      )}
    </View>
  );
}
