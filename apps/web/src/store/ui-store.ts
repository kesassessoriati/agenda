import { create } from "zustand";

type ToastSeverity = "success" | "error" | "info" | "warning";

type UiState = {
  toast: { message: string; severity: ToastSeverity } | null;
  showToast: (message: string, severity?: ToastSeverity) => void;
  clearToast: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  toast: null,
  showToast: (message, severity = "info") => set({ toast: { message, severity } }),
  clearToast: () => set({ toast: null }),
}));
