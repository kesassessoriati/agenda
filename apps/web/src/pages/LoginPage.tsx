import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import { Box, Button, ButtonGroup, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { login, registerWorkspace } from "../services/auth";
import { useAuthStore } from "../store/auth-store";
import { useUiStore } from "../store/ui-store";
import { getErrorMessage } from "../utils/error";

type LoginValues = {
  email: string;
  password: string;
};

type RegisterValues = {
  companyName: string;
  companySlug: string;
  ownerName: string;
  email: string;
  password: string;
  timezone: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const showToast = useUiStore((state) => state.showToast);
  const [mode, setMode] = useState<"login" | "register">("login");

  const loginForm = useForm<LoginValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterValues>({
    defaultValues: {
      companyName: "",
      companySlug: "",
      ownerName: "",
      email: "",
      password: "",
      timezone: "America/Sao_Paulo",
    },
  });

  const authMutation = useMutation({
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

  const registerMutation = useMutation({
    mutationFn: registerWorkspace,
    onSuccess: (data) => {
      setSession(data.token, data.user);
      showToast("Workspace criado com sucesso.", "success");
      navigate("/compromissos");
    },
    onError: (error) => {
      showToast(getErrorMessage(error), "error");
    },
  });

  const benefits = useMemo(
    () => [
      "Cada empresa opera em um workspace isolado com sessão tenant-scoped.",
      "Owners e admins gerenciam equipe, convites e acesso às agendas com validação no backend.",
      "Convites por e-mail funcionam com link seguro e aceite no workspace correto.",
    ],
    [],
  );

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
                    Plataforma KES
                  </Typography>
                  <Typography variant="h3">Agenda operacional agora pronta para múltiplos workspaces.</Typography>
                </Box>
              </Stack>

              <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.82)", maxWidth: 560 }}>
                O fluxo foi evoluído para tenancy real: autenticação tenant-scoped, memberships por workspace, convites por e-mail e administração segura da equipe.
              </Typography>

              <Stack spacing={1.5}>
                {benefits.map((item) => (
                  <Paper key={item} elevation={0} sx={{ p: 2, borderRadius: 0, background: "rgba(255,255,255,0.10)", color: "#ecfeff" }}>
                    {item}
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 4, md: 5 }, borderRadius: 0 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h4">{mode === "login" ? "Entrar" : "Criar workspace"}</Typography>
              </Box>

              <ButtonGroup fullWidth>
                <Button variant={mode === "login" ? "contained" : "outlined"} onClick={() => setMode("login")}>
                  Entrar
                </Button>
                <Button variant={mode === "register" ? "contained" : "outlined"} onClick={() => setMode("register")}>
                  Criar empresa
                </Button>
              </ButtonGroup>

              {mode === "login" ? (
                <>
                  <Controller name="email" control={loginForm.control} render={({ field }) => <TextField {...field} label="E-mail" fullWidth />} />
                  <Controller name="password" control={loginForm.control} render={({ field }) => <TextField {...field} type="password" label="Senha" fullWidth />} />

                  <Button
                    onClick={loginForm.handleSubmit((values) => authMutation.mutate(values))}
                    variant="contained"
                    size="large"
                    disabled={authMutation.isPending}
                  >
                    {authMutation.isPending ? "Entrando..." : "Acessar sistema"}
                  </Button>
                </>
              ) : (
                <>
                  <Controller name="companyName" control={registerForm.control} render={({ field }) => <TextField {...field} label="Nome da empresa" fullWidth />} />
                  <Controller
                    name="companySlug"
                    control={registerForm.control}
                    render={({ field }) => <TextField {...field} label="Slug do workspace (opcional)" fullWidth helperText="Se vazio, será gerado automaticamente." />}
                  />
                  <Controller name="ownerName" control={registerForm.control} render={({ field }) => <TextField {...field} label="Nome do responsável" fullWidth />} />
                  <Controller name="email" control={registerForm.control} render={({ field }) => <TextField {...field} label="E-mail" fullWidth />} />
                  <Controller name="password" control={registerForm.control} render={({ field }) => <TextField {...field} type="password" label="Senha" fullWidth />} />
                  <Controller name="timezone" control={registerForm.control} render={({ field }) => <TextField {...field} label="Timezone" fullWidth />} />

                  <Button
                    onClick={registerForm.handleSubmit((values) =>
                      registerMutation.mutate({
                        ...values,
                        companySlug: values.companySlug || undefined,
                      })
                    )}
                    variant="contained"
                    size="large"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Criando..." : "Criar workspace"}
                  </Button>
                </>
              )}
            </Stack>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
