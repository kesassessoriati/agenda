import AccountCircleRounded from "@mui/icons-material/AccountCircleRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import VisibilityOffRounded from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import {
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { changePassword, updateProfile } from "../services/auth";
import { useAuthStore } from "../store/auth-store";
import { useUiStore } from "../store/ui-store";
import { getErrorMessage } from "../utils/error";

type ProfileFormValues = {
  name: string;
  email: string;
};

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setSession = useAuthStore((state) => state.setSession);
  const showToast = useUiStore((state) => state.showToast);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
  } = useForm<ProfileFormValues>({
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
    },
  });

  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch: watchPassword,
  } = useForm<PasswordFormValues>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      setSession(data.token, data.user);
      showToast("Perfil atualizado com sucesso.", "success");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      resetPassword();
      showToast("Senha alterada com sucesso.", "success");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const newPasswordValue = watchPassword("newPassword");

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          p: { xs: 3, sm: 4 },
          background: "linear-gradient(135deg, #0f766e 0%, #1d4ed8 100%)",
          color: "#fff",
          borderRadius: 0,
        }}
      >
        <Typography variant="caption" sx={{ opacity: 0.75, textTransform: "uppercase", letterSpacing: 1 }}>
          Perfil
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5 }}>
          Meu Perfil
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.85 }}>
          Gerencie suas informações pessoais e credenciais de acesso.
        </Typography>
      </Paper>

      <Stack spacing={4} maxWidth={640}>
        {/* Profile information */}
        <Paper elevation={0} sx={{ p: 3, border: "1px solid rgba(15,23,42,0.08)" }}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
            <AccountCircleRounded sx={{ color: "#0f766e" }} />
            <Typography variant="h6" fontWeight={700}>
              Informações do Perfil
            </Typography>
          </Stack>

          <Box
            component="form"
            onSubmit={handleProfileSubmit((values) => profileMutation.mutate(values))}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="name"
                  control={profileControl}
                  rules={{
                    required: "Informe o nome.",
                    minLength: { value: 2, message: "Mín. 2 caracteres." },
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Nome"
                      fullWidth
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AccountCircleRounded fontSize="small" sx={{ color: "#94a3b8" }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="email"
                  control={profileControl}
                  rules={{
                    required: "Informe o e-mail.",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "E-mail inválido.",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="E-mail"
                      type="email"
                      fullWidth
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Stack direction="row" justifyContent="flex-end" mt={3}>
              <Button
                type="submit"
                variant="contained"
                disabled={profileMutation.isPending}
                sx={{ background: "linear-gradient(135deg, #0f766e, #1d4ed8)", fontWeight: 700 }}
              >
                {profileMutation.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </Stack>
          </Box>
        </Paper>

        <Divider />

        {/* Password change */}
        <Paper elevation={0} sx={{ p: 3, border: "1px solid rgba(15,23,42,0.08)" }}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
            <LockRounded sx={{ color: "#0f766e" }} />
            <Typography variant="h6" fontWeight={700}>
              Alterar Senha
            </Typography>
          </Stack>

          <Box
            component="form"
            onSubmit={handlePasswordSubmit((values) =>
              passwordMutation.mutate({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
              }),
            )}
          >
            <Stack spacing={2}>
              <Controller
                name="currentPassword"
                control={passwordControl}
                rules={{ required: "Informe a senha atual." }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Senha atual"
                    type={showCurrent ? "text" : "password"}
                    fullWidth
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message ?? "Deixe em branco para manter a senha atual."}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowCurrent((v) => !v)} edge="end" size="small">
                            {showCurrent ? (
                              <VisibilityOffRounded fontSize="small" />
                            ) : (
                              <VisibilityRounded fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
              <Controller
                name="newPassword"
                control={passwordControl}
                rules={{
                  required: "Informe a nova senha.",
                  minLength: { value: 6, message: "Mín. 6 caracteres." },
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Nova senha"
                    type={showNew ? "text" : "password"}
                    fullWidth
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowNew((v) => !v)} edge="end" size="small">
                            {showNew ? (
                              <VisibilityOffRounded fontSize="small" />
                            ) : (
                              <VisibilityRounded fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
              <Controller
                name="confirmPassword"
                control={passwordControl}
                rules={{
                  required: "Confirme a nova senha.",
                  validate: (value) => value === newPasswordValue || "As senhas não coincidem.",
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Confirmar nova senha"
                    type={showConfirm ? "text" : "password"}
                    fullWidth
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirm((v) => !v)} edge="end" size="small">
                            {showConfirm ? (
                              <VisibilityOffRounded fontSize="small" />
                            ) : (
                              <VisibilityRounded fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Stack>

            <Stack direction="row" justifyContent="flex-end" mt={3}>
              <Button
                type="submit"
                variant="outlined"
                color="inherit"
                disabled={passwordMutation.isPending}
                sx={{ fontWeight: 700 }}
              >
                {passwordMutation.isPending ? "Alterando..." : "Alterar senha"}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}
