import { create } from "zustand";

interface FileStore {
  file: File | null;
  audioBlob: Blob | null;
  transcript: string | null;
  isConverting: boolean;
  isTranscribing: boolean;
  conversionProgress: number;
  error: string | null;
  segments: Array<{ text: string; start: number; end: number }> | null;
  setFile: (file: File | null) => void;
  setAudioBlob: (blob: Blob | null) => void;
  setTranscript: (transcript: string | null) => void;
  setIsConverting: (isConverting: boolean) => void;
  setIsTranscribing: (isTranscribing: boolean) => void;
  setConversionProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  setSegments: (segments: Array<{ text: string; start: number; end: number }> | null) => void;
}

export const useFileStore = create<FileStore>((set) => ({
  file: null,
  audioBlob: null,
  transcript: null,
  isConverting: false,
  isTranscribing: false,
  conversionProgress: 0,
  error: null,
  segments: null, // Added segments initial state
  setFile: (file) => set({ file }),
  setAudioBlob: (audioBlob) => set({ audioBlob }),
  setTranscript: (transcript) => set({ transcript }),
  setIsConverting: (isConverting) => set({ isConverting }),
  setIsTranscribing: (isTranscribing) => set({ isTranscribing }),
  setConversionProgress: (conversionProgress) => set({ conversionProgress }),
  setError: (error) => set({ error }),
  setSegments: (segments) => set({ segments }), // Added setSegments action
}));