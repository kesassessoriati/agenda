import AddBusinessRounded from "@mui/icons-material/AddBusinessRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import WorkspacePremiumRounded from "@mui/icons-material/WorkspacePremiumRounded";
import {
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";

import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  createPlatformCompany,
  deletePlatformCompany,
  fetchPlatformCompanies,
  fetchPlatformCompanyDetails,
  updatePlatformCompany,
} from "../services/platform";
import { useAuthStore } from "../store/auth-store";
import { useUiStore } from "../store/ui-store";
import type { CompanyPlan } from "../types";
import { getErrorMessage } from "../utils/error";
import { formatDateTime } from "../utils/format";
import { getSubscriptionStatus } from "../utils/subscription";

type CompanyFormValues = {
  companyName: string;
  companySlug: string;
  timezone: string;
  plan: CompanyPlan;
  planExpiresAt: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
};

const ALL_PLANS: CompanyPlan[] = ["FREE", "BASIC", "PREMIUM", "UNLIMITED"];

const planLabels: Record<CompanyPlan, string> = {
  FREE: "Free",
  BASIC: "Basic",
  PREMIUM: "Premium",
  UNLIMITED: "Ilimitado",
};

const planColors: Record<CompanyPlan, "default" | "primary" | "success" | "warning"> = {
  FREE: "default",
  BASIC: "primary",
  PREMIUM: "warning",
  UNLIMITED: "success",
};

function formatExpiryLabel(plan: CompanyPlan, planExpiresAt?: string | null): string {
  const status = getSubscriptionStatus(plan, planExpiresAt);
  if (status.kind === "unlimited") return "Ilimitado";
  if (status.kind === "no_expiry") return "—";
  if (status.kind === "expired") return `Expirado há ${status.daysOverdue}d`;
  if (status.kind === "expiring_soon") return `Vence em ${status.daysRemaining}d`;
  return `${status.daysRemaining}d restantes`;
}

export function PlatformPage() {
  const user = useAuthStore((state) => state.user);
  const showToast = useUiStore((state) => state.showToast);
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<{ id: string; name: string } | null>(null);
  const { control, handleSubmit, reset, watch } = useForm<CompanyFormValues>({
    defaultValues: {
      companyName: "",
      companySlug: "",
      timezone: "America/Sao_Paulo",
      plan: "FREE",
      planExpiresAt: "",
      ownerName: "",
      ownerEmail: "",
      ownerPassword: "",
    },
  });

  const formPlan = watch("plan");

  const companiesQuery = useQuery({
    queryKey: ["platform-companies"],
    queryFn: fetchPlatformCompanies,
    enabled: user?.platformRole === "SUPERADMIN",
  });

  const companyDetailQuery = useQuery({
    queryKey: ["platform-company", selectedCompanyId],
    queryFn: () => fetchPlatformCompanyDetails(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId) && user?.platformRole === "SUPERADMIN",
  });

  const createCompanyMutation = useMutation({
    mutationFn: createPlatformCompany,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platform-companies"] });
      setSelectedCompanyId(data.company.id);
      reset({
        companyName: "",
        companySlug: "",
        timezone: "America/Sao_Paulo",
        plan: "FREE",
        planExpiresAt: "",
        ownerName: "",
        ownerEmail: "",
        ownerPassword: "",
      });
      showToast("Empresa criada pela plataforma.", "success");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const updateCompanyMutation = useMutation({
    mutationFn: ({ companyId, payload }: { companyId: string; payload: { plan?: CompanyPlan; planExpiresAt?: string | null } }) =>
      updatePlatformCompany(companyId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["platform-companies"] });
      queryClient.invalidateQueries({ queryKey: ["platform-company", variables.companyId] });
      showToast("Plano da empresa atualizado.", "success");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: deletePlatformCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-companies"] });
      setSelectedCompanyId(null);
      setCompanyToDelete(null);
      showToast("Empresa removida da plataforma.", "success");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const companies = companiesQuery.data?.companies ?? [];
  const selectedCompany = companyDetailQuery.data?.company;

  return (
    <Stack spacing={3}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 0,
          background: "linear-gradient(135deg, #111827 0%, #1d4ed8 40%, #0f766e 100%)",
          color: "#fff",
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={1.5}>
              <Chip label="Plataforma" sx={{ alignSelf: "flex-start", color: "#dbeafe", background: "rgba(255,255,255,0.12)" }} />
              <Typography variant="h3">Superadmin, governança de empresas e atribuição de planos.</Typography>
              <Typography color="rgba(255,255,255,0.76)">
                Camada acima do tenant para acompanhar novas empresas, controlar ciclo de vida e preparar billing e moderação futura.
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 0, background: "rgba(255,255,255,0.12)", color: "#ecfeff" }}>
              Sessão de plataforma: {user?.email}
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        {[
          { label: "Empresas", value: companies.length },
          { label: "Free", value: companies.filter((company) => company.plan === "FREE").length },
          { label: "Premium", value: companies.filter((company) => company.plan === "PREMIUM").length },
          { label: "Ilimitado", value: companies.filter((company) => company.plan === "UNLIMITED").length },
        ].map((item) => (
          <Grid size={{ xs: 6, md: 3 }} key={item.label}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 0 }}>
              <Typography color="text.secondary">{item.label}</Typography>
              <Typography variant="h3">{item.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 0 }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h5">Criar empresa manualmente</Typography>
                <Typography color="text.secondary">
                  O superadmin pode criar uma empresa diretamente e já atribuir o plano e o responsável inicial.
                </Typography>
              </Box>

              <Controller name="companyName" control={control} render={({ field }) => <TextField {...field} label="Nome da empresa" fullWidth />} />
              <Controller
                name="companySlug"
                control={control}
                render={({ field }) => <TextField {...field} label="Slug (opcional)" helperText="Se vazio, será gerado automaticamente." fullWidth />}
              />
              <Controller name="timezone" control={control} render={({ field }) => <TextField {...field} label="Timezone" fullWidth />} />
              <Controller
                name="plan"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Plano" fullWidth>
                    {ALL_PLANS.map((plan) => (
                      <MenuItem key={plan} value={plan}>
                        {planLabels[plan]}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              {formPlan !== "UNLIMITED" ? (
                <Controller
                  name="planExpiresAt"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="date"
                      label="Vencimento do plano (opcional)"
                      helperText="Deixe em branco para plano sem data de expiração."
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              ) : null}
              <Controller name="ownerName" control={control} render={({ field }) => <TextField {...field} label="Nome do responsável" fullWidth />} />
              <Controller name="ownerEmail" control={control} render={({ field }) => <TextField {...field} label="E-mail do responsável" fullWidth />} />
              <Controller
                name="ownerPassword"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="password"
                    label="Senha inicial (exigida se o responsável ainda não existir)"
                    fullWidth
                  />
                )}
              />

              <Button
                startIcon={<AddBusinessRounded />}
                variant="contained"
                onClick={handleSubmit((values) =>
                  createCompanyMutation.mutate({
                    ...values,
                    companySlug: values.companySlug || undefined,
                    ownerName: values.ownerName || undefined,
                    ownerPassword: values.ownerPassword || undefined,
                    planExpiresAt: values.plan === "UNLIMITED" || !values.planExpiresAt ? null : values.planExpiresAt,
                  })
                )}
                disabled={createCompanyMutation.isPending}
              >
                {createCompanyMutation.isPending ? "Criando empresa..." : "Criar empresa"}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 0 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h5">Empresas cadastradas</Typography>
                <Typography color="text.secondary">
                  Toda empresa criada publicamente ou manualmente aparece aqui imediatamente para revisão e gestão de plano.
                </Typography>
              </Box>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Empresa</TableCell>
                    <TableCell>Plano</TableCell>
                    <TableCell>Expiração</TableCell>
                    <TableCell>Métricas</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow
                      key={company.id}
                      hover
                      selected={company.id === selectedCompanyId}
                      onClick={() => setSelectedCompanyId(company.id)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography fontWeight={800}>{company.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {company.slug} • criada em {formatDateTime(company.createdAt)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ minWidth: 170 }}>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={company.plan}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            updateCompanyMutation.mutate({
                              companyId: company.id,
                              payload: {
                                plan: event.target.value as CompanyPlan,
                                planExpiresAt: event.target.value === "UNLIMITED" ? null : undefined,
                              },
                            })
                          }
                        >
                          {ALL_PLANS.map((plan) => (
                            <MenuItem key={plan} value={plan}>
                              {planLabels[plan]}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        {company.plan !== "UNLIMITED" ? (
                          <TextField
                            type="date"
                            size="small"
                            value={company.planExpiresAt ? company.planExpiresAt.slice(0, 10) : ""}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              updateCompanyMutation.mutate({
                                companyId: company.id,
                                payload: { planExpiresAt: event.target.value || null },
                              })
                            }
                            sx={{ minWidth: 150 }}
                          />
                        ) : (
                          <Typography variant="body2" color="success.main" fontWeight={700}>
                            Ilimitado
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {company.metrics.activeMemberships} membros ativos • {company.metrics.schedules} agendas • {company.metrics.appointments} compromissos
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          color="error"
                          startIcon={<DeleteOutlineRounded />}
                          onClick={(event) => {
                            event.stopPropagation();
                            setCompanyToDelete({ id: company.id, name: company.name });
                          }}
                        >
                          Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </Paper>

          {selectedCompany ? (
            <Paper elevation={0} sx={{ p: 3, borderRadius: 0, mt: 3, background: "linear-gradient(135deg, rgba(17,24,39,0.04), rgba(29,78,216,0.08))" }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <WorkspacePremiumRounded color="primary" />
                  <Typography variant="h5">{selectedCompany.name}</Typography>
                  <Chip
                    label={planLabels[selectedCompany.plan]}
                    color={planColors[selectedCompany.plan]}
                    variant="outlined"
                  />
                  <Chip
                    label={formatExpiryLabel(selectedCompany.plan, selectedCompany.planExpiresAt)}
                    size="small"
                    color={
                      selectedCompany.plan === "UNLIMITED"
                        ? "success"
                        : !selectedCompany.planExpiresAt
                          ? "default"
                          : getSubscriptionStatus(selectedCompany.plan, selectedCompany.planExpiresAt).kind === "expired"
                            ? "error"
                            : getSubscriptionStatus(selectedCompany.plan, selectedCompany.planExpiresAt).kind === "expiring_soon"
                              ? "warning"
                              : "default"
                    }
                  />
                </Stack>
                <Typography color="text.secondary">
                  {selectedCompany.slug} • timezone {selectedCompany.timezone} • atualizado em {formatDateTime(selectedCompany.updatedAt)}
                </Typography>
                <Typography color="text.secondary">
                  Owners: {selectedCompany.metrics.owners} • Admins: {selectedCompany.metrics.admins} • Convites: {selectedCompany.metrics.invitations}
                </Typography>
                <Box>
                  <Typography fontWeight={800}>Responsáveis atuais</Typography>
                  <Stack spacing={0.5} mt={1}>
                    {selectedCompany.owners.map((owner) => (
                      <Typography key={owner.id} color="text.secondary">
                        {owner.name} • {owner.email}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
                <Box>
                  <Typography fontWeight={800}>Membros recentes</Typography>
                  <Stack spacing={0.5} mt={1}>
                    {selectedCompany.members.slice(0, 6).map((member) => (
                      <Typography key={member.id} color="text.secondary">
                        {member.user.name} • {member.role} • {member.user.email}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          ) : null}
        </Grid>
      </Grid>

      <ConfirmDialog
        open={Boolean(companyToDelete)}
        title="Excluir empresa"
        description={`Deseja realmente excluir a empresa "${companyToDelete?.name}"? Todos os dados do tenant serão removidos em cascata.`}
        confirmLabel="Excluir empresa"
        onClose={() => setCompanyToDelete(null)}
        onConfirm={() => companyToDelete && deleteCompanyMutation.mutate(companyToDelete.id)}
      />
    </Stack>
  );
}
