/**
 * Inventory Manager Zustand Store
 *
 * Manages all ephemeral UI state for the InventoryManagerScreen:
 *  - Input mode (manual / voice / scan)
 *  - Inline product form fields
 *  - Voice recording FSM
 *  - Search / filter / sort state
 *  - Staff share modal
 *
 * Security: no sensitive data is persisted; store is entirely in-memory.
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Enums / Narrow Types
// ---------------------------------------------------------------------------

export type InputMode = 'manual' | 'voice' | 'scan';
export type VoiceState = 'idle' | 'listening' | 'processing' | 'parsed' | 'error';
export type StockFilter = '' | 'ok' | 'low' | 'out';
export type SortKey = '' | 'name' | 'qty' | 'profit' | 'date';

// ---------------------------------------------------------------------------
// Parsed Voice Product
// ---------------------------------------------------------------------------

export interface ParsedVoiceProduct {
  readonly name: string;
  readonly quantity: number;
  readonly costPrice: number;
  readonly sellPrice: number;
  readonly pack: string;
  readonly category: string;
  readonly expenses: number;
  readonly sold: number;
  readonly reorderLevel: number;
}

// ---------------------------------------------------------------------------
// Manual Form Fields
// ---------------------------------------------------------------------------

export interface ManualFormFields {
  name: string;
  category: string;
  quantity: string;
  pack: string;
  costPrice: string;
  sellPrice: string;
  expenses: string;
  sold: string;
  reorderLevel: string;
}

const EMPTY_FORM: ManualFormFields = {
  name: '',
  category: '',
  quantity: '',
  pack: 'Piece',
  costPrice: '',
  sellPrice: '',
  expenses: '',
  sold: '0',
  reorderLevel: '10',
};

// ---------------------------------------------------------------------------
// Store Shape
// ---------------------------------------------------------------------------

interface InventoryManagerState {
  // --- Input panel ---
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;

  // --- Manual form ---
  form: ManualFormFields;
  setField: <K extends keyof ManualFormFields>(key: K, value: string) => void;
  resetForm: () => void;

  // --- Voice FSM ---
  voiceState: VoiceState;
  voiceTranscript: string;
  parsedVoice: ParsedVoiceProduct | null;
  setVoiceState: (state: VoiceState) => void;
  setVoiceTranscript: (text: string) => void;
  setParsedVoice: (product: ParsedVoiceProduct | null) => void;
  resetVoice: () => void;

  // --- Filters & search ---
  searchText: string;
  stockFilter: StockFilter;
  sortKey: SortKey;
  setSearchText: (text: string) => void;
  setStockFilter: (filter: StockFilter) => void;
  setSortKey: (key: SortKey) => void;

  // --- Staff share modal ---
  shareModalOpen: boolean;
  setShareModalOpen: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const useInventoryManagerStore = create<InventoryManagerState>((set) => ({
  // Input panel
  inputMode: 'manual',
  setInputMode: (mode) => set({ inputMode: mode }),

  // Manual form
  form: { ...EMPTY_FORM },
  setField: (key, value) =>
    set((state) => ({ form: { ...state.form, [key]: value } })),
  resetForm: () => set({ form: { ...EMPTY_FORM } }),

  // Voice FSM
  voiceState: 'idle',
  voiceTranscript: '',
  parsedVoice: null,
  setVoiceState: (voiceState) => set({ voiceState }),
  setVoiceTranscript: (voiceTranscript) => set({ voiceTranscript }),
  setParsedVoice: (parsedVoice) => set({ parsedVoice }),
  resetVoice: () =>
    set({ voiceState: 'idle', voiceTranscript: '', parsedVoice: null }),

  // Filters & search
  searchText: '',
  stockFilter: '',
  sortKey: '',
  setSearchText: (searchText) => set({ searchText }),
  setStockFilter: (stockFilter) => set({ stockFilter }),
  setSortKey: (sortKey) => set({ sortKey }),

  // Staff share modal
  shareModalOpen: false,
  setShareModalOpen: (shareModalOpen) => set({ shareModalOpen }),
}));
