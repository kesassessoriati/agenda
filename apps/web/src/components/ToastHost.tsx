import { Alert, Snackbar } from "@mui/material";

import { useUiStore } from "../store/ui-store";

export function ToastHost() {
  const toast = useUiStore((state) => state.toast);
  const clearToast = useUiStore((state) => state.clearToast);

  return (
    <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={clearToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
      {toast ? (
        <Alert onClose={clearToast} severity={toast.severity} variant="filled" sx={{ minWidth: 280 }}>
          {toast.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
