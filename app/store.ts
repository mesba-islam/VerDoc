import { create } from "zustand";

interface FileStore {
  file: File | null;
  audioBlob: Blob | null;
  isConverting: boolean;
  conversionProgress: number;
  error: string | null;
  setFile: (file: File | null) => void;
  setAudioBlob: (blob: Blob | null) => void;
  setIsConverting: (isConverting: boolean) => void;
  setConversionProgress: (progress: number) => void;
  setError: (error: string | null) => void;
}

export const useFileStore = create<FileStore>((set) => ({
  file: null,
  audioBlob: null,
  isConverting: false,
  conversionProgress: 0,
  error: null,
  setFile: (file) => set({ file }),
  setAudioBlob: (audioBlob) => set({ audioBlob }),
  setIsConverting: (isConverting) => set({ isConverting }),
  setConversionProgress: (conversionProgress) => set({ conversionProgress }),
  setError: (error) => set({ error }),
}));