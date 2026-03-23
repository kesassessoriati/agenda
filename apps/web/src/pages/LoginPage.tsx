import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import { Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { login } from "../services/auth";
import { useAuthStore } from "../store/auth-store";
import { useUiStore } from "../store/ui-store";
import { getErrorMessage } from "../utils/error";

type LoginValues = {
  email: string;
  password: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const showToast = useUiStore((state) => state.showToast);
  const { control, handleSubmit } = useForm<LoginValues>({
    defaultValues: {
      email: "admin@kes.local",
      password: "admin123",
    },
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession(data.token, data.user);
      showToast("Sessão iniciada com sucesso.", "success");
      navigate("/compromissos");
    },
    onError: (error) => {
      showToast(getErrorMessage(error), "error");
    },
  });

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #062925 0%, #0f766e 45%, #1d4ed8 100%)", py: { xs: 4, md: 8 } }}>
      <Container maxWidth="lg">
        <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" }, alignItems: "stretch" }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 6 },
              borderRadius: 8,
              background: "rgba(255,255,255,0.10)",
              color: "#fff",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <Stack spacing={3}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 60, height: 60, borderRadius: 4, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.12)" }}>
                  <EventAvailableRounded sx={{ fontSize: 34 }} />
                </Box>
                <Box>
                  <Typography variant="overline" sx={{ color: "#99f6e4", fontWeight: 800 }}>
                    Plataforma KES
                  </Typography>
                  <Typography variant="h3">Agenda operacional com visão de calendário, fila e integração Google.</Typography>
                </Box>
              </Stack>

              <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.82)", maxWidth: 560 }}>
                O novo sistema replica os blocos funcionais do módulo legado: agendas, compromissos, dashboard, filtros por contexto,
                controle de conflito, permissões e sincronização manual com calendário externo.
              </Typography>

              <Stack spacing={1.5}>
                {[
                  "Agendas com responsáveis, horário operacional e ativação/inativação.",
                  "Compromissos em lista e calendário com indicadores e ações rápidas.",
                  "Integração opcional com Google Calendar e propagação de atualizações.",
                ].map((item) => (
                  <Paper key={item} elevation={0} sx={{ p: 2, borderRadius: 4, background: "rgba(255,255,255,0.10)", color: "#ecfeff" }}>
                    {item}
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 4, md: 5 }, borderRadius: 8 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h4">Entrar</Typography>
                <Typography variant="body2" color="text.secondary">
                  Ambiente de demonstração já preenchido com um usuário administrador.
                </Typography>
              </Box>

              <Controller name="email" control={control} render={({ field }) => <TextField {...field} label="E-mail" fullWidth />} />
              <Controller name="password" control={control} render={({ field }) => <TextField {...field} type="password" label="Senha" fullWidth />} />

              <Button onClick={handleSubmit((values) => mutation.mutate(values))} variant="contained" size="large" disabled={mutation.isPending}>
                {mutation.isPending ? "Entrando..." : "Acessar sistema"}
              </Button>

              <Typography variant="caption" color="text.secondary">
                Admin demo: `admin@kes.local` / `admin123`
              </Typography>
            </Stack>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
