import React, { useRef, useState } from 'react';
import { View, Button, Text, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';

interface AudioRecorderProps {
  onRecordingFinished: (audioUri: string, audioBlob: Blob) => void;
}

export default function AudioRecorder({ onRecordingFinished }: AudioRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startRecording = async () => {
    setError(null);
    try {
      setLoading(true);
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
    } catch (e) {
      setError('Failed to start recording');
    } finally {
      setLoading(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setLoading(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error('No audio URI');
      // Fetch the file as a blob
      const response = await fetch(uri);
      const blob = await response.blob();
      onRecordingFinished(uri, blob);
    } catch (e) {
      setError('Failed to stop recording');
    } finally {
      setIsRecording(false);
      setRecording(null);
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
