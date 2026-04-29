import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { InventoryCreate } from '../types/inventory';
import { createInventory, uploadVoice } from '../services/inventoryApi';
import AudioRecorder from './AudioRecorder';

interface FieldConfig {
  name: keyof InventoryCreate;
  label: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  required?: boolean;
}

const FORM_FIELDS: FieldConfig[] = [
  { name: 'product_name', label: 'Product Name', required: true },
  { name: 'customer_id', label: 'Customer ID', required: true },
  { name: 'quantity', label: 'Quantity', keyboardType: 'numeric', required: true },
  { name: 'pack_quantity', label: 'Pack Quantity', keyboardType: 'numeric' },
  { name: 'product_cost', label: 'Product Cost', keyboardType: 'decimal-pad', required: true },
  { name: 'price', label: 'Price', keyboardType: 'decimal-pad', required: true },
  { name: 'sold', label: 'Sold', keyboardType: 'numeric', required: true },
];

export default function InventoryForm() {
  const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<InventoryCreate>({
    defaultValues: {
      product_name: '',
      customer_id: '',
      quantity: 0,
      pack_quantity: 0,
      product_cost: 0,
      price: 0,
      sold: 0,
    },
  });
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceField, setVoiceField] = useState<keyof InventoryCreate | null>(null);

  const [submitSuccess, setSubmitSuccess] = useState(false);

  const onSubmit = useCallback(async (data: InventoryCreate) => {
    try {
      if (data.sold > data.quantity) {
        Alert.alert('Validation Error', 'Sold cannot exceed quantity');
        return;
      }
      await createInventory(data);
      setSubmitSuccess(true);
      Alert.alert('Success', 'Inventory item created successfully');
      Object.keys(data).forEach(key => {
        setValue(key as keyof InventoryCreate, 0 as any);
      });
      setTimeout(() => setSubmitSuccess(false), 2000);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  }, [setValue]);

  const handleVoiceInput = useCallback((field: keyof InventoryCreate) => {
    setVoiceField(field);
  }, []);

  const handleRecordingFinished = useCallback(async (audioUri: string, audioBlob: Blob) => {
    setVoiceLoading(true);
    try {
      const result = await uploadVoice(audioBlob);
      if (!voiceField) return;

      const numericFields = ['quantity', 'pack_quantity', 'sold', 'product_cost', 'price'];
      if (numericFields.includes(voiceField)) {
        if (result.extracted_number) {
          setValue(voiceField, Number(result.extracted_number));
        } else {
          Alert.alert('Info', `Heard: "${result.text}" - No number extracted`);
        }
      } else {
        setValue(voiceField, result.text);
      }
      setVoiceField(null);
    } catch (e) {
      Alert.alert('Voice Error', (e as Error).message);
    } finally {
      setVoiceLoading(false);
    }
  }, [voiceField, setValue]);

  const isFormValid = useMemo(() => {
    const values = getValues();
    return values.product_name && values.customer_id && values.quantity > 0 && values.price > 0;
  }, [getValues]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Add Inventory Item</Text>
      {submitSuccess && <Text style={styles.successMessage}>✓ Item created successfully!</Text>}

      {FORM_FIELDS.map((field) => (
        <View key={field.name} style={styles.fieldContainer}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={styles.required}>*</Text>}
          </Text>
          <View style={styles.inputWithButton}>
            <Controller
              control={control}
              name={field.name}
              rules={field.required ? { required: true } : {}}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors[field.name] && styles.inputError]}
                  value={String(value)}
                  onChangeText={(v) =>
                    onChange(
                      field.keyboardType === 'numeric'
                        ? parseInt(v) || 0
                        : parseFloat(v) || 0
                    )
                  }
                  keyboardType={field.keyboardType || 'default'}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  editable={voiceField !== field.name}
                />
              )}
            />
            <Button
              title="🎤"
              onPress={() => handleVoiceInput(field.name)}
              disabled={voiceLoading || voiceField !== null}
            />
          </View>
          {errors[field.name] && (
            <Text style={styles.error}>{field.label} is required</Text>
          )}
          {voiceField === field.name && (
            <AudioRecorder onRecordingFinished={handleRecordingFinished} />
          )}
        </View>
      ))}

      <View style={styles.buttonContainer}>
        <Button
          title={isSubmitting ? 'Submitting...' : 'Submit'}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting || !isFormValid || voiceLoading}
        />
      </View>
      {(isSubmitting || voiceLoading) && <ActivityIndicator size="large" />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  fieldContainer: {
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  required: {
    color: 'red',
  },
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    marginRight: 8,
  },
  inputError: {
    borderColor: 'red',
  },
  error: {
    color: 'red',
    fontSize: 12,
  },
  successMessage: {
    color: 'green',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  buttonContainer: {
    marginVertical: 16,
  },
});
