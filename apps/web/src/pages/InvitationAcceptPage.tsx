import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import { Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { acceptInvitation, fetchInvitationPreview } from "../services/team";
import { useAuthStore } from "../store/auth-store";
import { useUiStore } from "../store/ui-store";
import { getErrorMessage } from "../utils/error";
import { formatDateTime } from "../utils/format";

type AcceptFormValues = {
  name: string;
  password: string;
  timezone: string;
};

export function InvitationAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const showToast = useUiStore((state) => state.showToast);
  const { control, handleSubmit } = useForm<AcceptFormValues>({
    defaultValues: {
      name: "",
      password: "",
      timezone: "America/Sao_Paulo",
    },
  });

  const previewQuery = useQuery({
    queryKey: ["invitation-preview", token],
    queryFn: () => fetchInvitationPreview(token!),
    enabled: Boolean(token),
  });

  const acceptMutation = useMutation({
    mutationFn: (values: AcceptFormValues) => acceptInvitation(token!, values),
    onSuccess: (data) => {
      setSession(data.token, data.user);
      showToast("Convite aceito com sucesso.", "success");
      navigate("/compromissos");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const invitation = previewQuery.data;

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #062925 0%, #0f766e 45%, #1d4ed8 100%)", py: { xs: 4, md: 8 } }}>
      <Container maxWidth="lg">
        <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" }, alignItems: "stretch" }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 6 },
              borderRadius: 0,
              background: "rgba(255,255,255,0.10)",
              color: "#fff",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <Stack spacing={3}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 60, height: 60, borderRadius: 0, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.12)" }}>
                  <EventAvailableRounded sx={{ fontSize: 34 }} />
                </Box>
                <Box>
                  <Typography variant="overline" sx={{ color: "#99f6e4", fontWeight: 800 }}>
                    Convite de workspace
                  </Typography>
                  <Typography variant="h3">Entre no tenant certo com vínculo seguro por e-mail.</Typography>
                </Box>
              </Stack>

              {invitation ? (
                <Stack spacing={1.5}>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 0, background: "rgba(255,255,255,0.10)", color: "#ecfeff" }}>
                    Workspace: {invitation.company.name}
                  </Paper>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 0, background: "rgba(255,255,255,0.10)", color: "#ecfeff" }}>
                    Convite para: {invitation.email}
                  </Paper>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 0, background: "rgba(255,255,255,0.10)", color: "#ecfeff" }}>
                    Papel: {invitation.role}
                  </Paper>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 0, background: "rgba(255,255,255,0.10)", color: "#ecfeff" }}>
                    Expira em: {formatDateTime(invitation.expiresAt)}
                  </Paper>
                </Stack>
              ) : (
                <Typography color="rgba(255,255,255,0.82)">Carregando detalhes do convite...</Typography>
              )}
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 4, md: 5 }, borderRadius: 0 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h4">Aceitar convite</Typography>
                <Typography color="text.secondary">
                  {invitation?.existingUser
                    ? "Identificamos uma conta existente com este e-mail. Informe sua senha para vincular o workspace."
                    : "Crie a sua conta para concluir o ingresso no workspace."}
                </Typography>
              </Box>

              {!invitation?.existingUser ? (
                <Controller name="name" control={control} render={({ field }) => <TextField {...field} label="Nome" fullWidth />} />
              ) : null}
              <Controller name="password" control={control} render={({ field }) => <TextField {...field} type="password" label="Senha" fullWidth />} />
              <Controller name="timezone" control={control} render={({ field }) => <TextField {...field} label="Timezone" fullWidth />} />

              <Button
                onClick={handleSubmit((values) => acceptMutation.mutate(values))}
                variant="contained"
                size="large"
                disabled={acceptMutation.isPending || invitation?.status !== "PENDING"}
              >
                {acceptMutation.isPending ? "Aceitando..." : "Entrar no workspace"}
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
