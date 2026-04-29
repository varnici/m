import { InventoryCreate, InventoryRecord, InventorySummary, VoiceTranscribeResponse } from '../types/voice-inventory';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export async function createInventory(item: InventoryCreate): Promise<InventoryRecord> {
  const res = await fetch(`${API_URL}/inventory/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error('Failed to create inventory');
  return res.json();
}

export async function listInventory(): Promise<InventoryRecord[]> {
  const res = await fetch(`${API_URL}/inventory/`);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export async function getInventory(id: string): Promise<InventoryRecord> {
  const res = await fetch(`${API_URL}/inventory/${id}`);
  if (!res.ok) throw new Error('Not found');
  return res.json();
}

export async function updateInventory(id: string, item: Partial<InventoryCreate>): Promise<InventoryRecord> {
  const res = await fetch(`${API_URL}/inventory/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error('Failed to update inventory');
  return res.json();
}

export async function deleteInventory(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete inventory');
}

export async function getSummary(): Promise<InventorySummary> {
  const res = await fetch(`${API_URL}/inventory/summary`);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

// Voice upload (audio file as FormData)
export async function uploadVoice(file: Blob): Promise<VoiceTranscribeResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/voice/transcribe`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Voice upload failed');
  return res.json();
}
