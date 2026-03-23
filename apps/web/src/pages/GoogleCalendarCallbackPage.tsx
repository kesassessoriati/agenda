import { CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useUiStore } from "../store/ui-store";

export function GoogleCalendarCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const showToast = useUiStore((state) => state.showToast);

  useEffect(() => {
    if (params.get("status") === "success") {
      showToast("Google Calendar conectado com sucesso.", "success");
    } else {
      showToast("Não foi possível concluir a integração com o Google Calendar.", "error");
    }

    navigate("/agendas");
  }, [navigate, params, showToast]);

  return (
    <Stack minHeight="100vh" alignItems="center" justifyContent="center" spacing={2}>
      <CircularProgress />
      <Typography color="text.secondary">Finalizando integração com Google Calendar...</Typography>
    </Stack>
  );
}
