import GroupAddRounded from "@mui/icons-material/GroupAddRounded";
import LinkOffRounded from "@mui/icons-material/LinkOffRounded";
import ShieldRounded from "@mui/icons-material/ShieldRounded";
import {
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
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

import { createTeamInvitation, fetchTeamInvitations, fetchTeamMembers, revokeTeamInvitation, updateTeamMember } from "../services/team";
import { useAuthStore } from "../store/auth-store";
import { useUiStore } from "../store/ui-store";
import type { WorkspaceRole } from "../types";
import { getErrorMessage } from "../utils/error";
import { formatDateTime } from "../utils/format";

type InviteFormValues = {
  email: string;
  role: WorkspaceRole;
};

const roleLabels: Record<WorkspaceRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Membro",
};

export function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const showToast = useUiStore((state) => state.showToast);
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset } = useForm<InviteFormValues>({
    defaultValues: {
      email: "",
      role: user?.role === "OWNER" ? "ADMIN" : "MEMBER",
    },
  });

  const membersQuery = useQuery({
    queryKey: ["team-members", user?.companyId],
    queryFn: fetchTeamMembers,
    enabled: Boolean(user?.companyId),
  });

  const invitationsQuery = useQuery({
    queryKey: ["team-invitations", user?.companyId],
    queryFn: fetchTeamInvitations,
    enabled: Boolean(user?.companyId),
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ membershipId, payload }: { membershipId: string; payload: { role?: WorkspaceRole; active?: boolean } }) =>
      updateTeamMember(membershipId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", user?.companyId] });
      showToast("Membro atualizado.", "success");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const inviteMutation = useMutation({
    mutationFn: createTeamInvitation,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations", user?.companyId] });
      reset({ email: "", role: user?.role === "OWNER" ? "ADMIN" : "MEMBER" });
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.delivery.invitationUrl);
      }
      showToast("Convite criado e link copiado para a área de transferência.", "success");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeTeamInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations", user?.companyId] });
      showToast("Convite revogado.", "success");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const members = membersQuery.data?.members ?? [];
  const invitations = invitationsQuery.data?.invitations ?? [];
  const pendingInvitations = invitations.filter((item) => item.status === "PENDING");
  const availableRoles: WorkspaceRole[] = user?.role === "OWNER" ? ["OWNER", "ADMIN", "MEMBER"] : ["ADMIN", "MEMBER"];

  return (
    <Stack spacing={3}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 0,
          background: "linear-gradient(135deg, #0f172a 0%, #1f3b73 44%, #0f766e 100%)",
          color: "#fff",
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={1.5}>
              <Chip label="Administrador" sx={{ alignSelf: "flex-start", color: "#dbeafe", background: "rgba(255,255,255,0.12)" }} />
              <Typography variant="h3">Equipe, convites e governança do workspace.</Typography>
              <Typography color="rgba(255,255,255,0.76)">
                Acesso multi-tenant por membership: owners e admins controlam equipe, convites e a distribuição segura de acesso às agendas.
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={1.5}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 0, background: "rgba(255,255,255,0.12)", color: "#ecfeff" }}>
                Workspace ativo: {user?.company.name}
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        {[
          { label: "Membros", value: members.length },
          { label: "Admins/Owners", value: members.filter((member) => member.role !== "MEMBER" && member.active).length },
          { label: "Convites pendentes", value: pendingInvitations.length },
        ].map((item) => (
          <Grid size={{ xs: 12, md: 4 }} key={item.label}>
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
                <Typography variant="h5">Convidar membro</Typography>
                <Typography color="text.secondary">
                  O repositório não possui provedor de e-mail configurado. O convite é emitido com link seguro para entrega manual.
                </Typography>
              </Box>

              <Controller
                name="email"
                control={control}
                rules={{ required: "Informe o e-mail do convidado." }}
                render={({ field }) => <TextField {...field} label="E-mail" fullWidth />}
              />
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Papel no workspace" fullWidth>
                    {availableRoles.map((role) => (
                      <MenuItem key={role} value={role}>
                        {roleLabels[role]}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              <Button
                startIcon={<GroupAddRounded />}
                variant="contained"
                onClick={handleSubmit((values) => inviteMutation.mutate(values))}
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "Criando convite..." : "Gerar convite"}
              </Button>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 0, mt: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Convites recentes</Typography>
              <Typography color="text.secondary">
                {invitationsQuery.data?.emailDelivery.note}
              </Typography>
              {invitations.map((invitation) => (
                <Box key={invitation.id} sx={{ p: 2, border: "1px solid rgba(15,23,42,0.08)" }}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
                    <Box>
                      <Typography fontWeight={800}>{invitation.email}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {roleLabels[invitation.role]} • {invitation.status} • expira em {formatDateTime(invitation.expiresAt)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {invitation.status === "PENDING" ? (
                        <Button
                          size="small"
                          startIcon={<LinkOffRounded />}
                          color="error"
                          onClick={() => revokeMutation.mutate(invitation.id)}
                        >
                          Revogar
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 0 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h5">Equipe do workspace</Typography>
                <Typography color="text.secondary">
                  Mudanças de papel e ativação são validadas no backend com proteção contra perda do último owner.
                </Typography>
              </Box>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Membro</TableCell>
                    <TableCell>Papel</TableCell>
                    <TableCell>Último acesso</TableCell>
                    <TableCell align="right">Ativo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id} hover>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography fontWeight={800}>{member.user.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {member.user.email}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={member.role}
                          disabled={member.id === user?.membershipId}
                          onChange={(event) =>
                            updateMemberMutation.mutate({
                              membershipId: member.id,
                              payload: { role: event.target.value as WorkspaceRole },
                            })
                          }
                        >
                          {availableRoles.map((role) => (
                            <MenuItem key={role} value={role}>
                              {roleLabels[role]}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>{member.lastAccessedAt ? formatDateTime(member.lastAccessedAt) : "Ainda não acessou"}</TableCell>
                      <TableCell align="right">
                        <Switch
                          checked={member.active}
                          disabled={member.id === user?.membershipId}
                          onChange={(_, checked) =>
                            updateMemberMutation.mutate({
                              membershipId: member.id,
                              payload: { active: checked },
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 0, mt: 3, background: "linear-gradient(135deg, rgba(15,118,110,0.08), rgba(29,78,216,0.08))" }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <ShieldRounded color="primary" />
              <Typography color="text.secondary">
                O acesso às agendas continua sendo concedido por agenda, mas a elegibilidade do usuário agora depende primeiro da membership ativa no tenant.
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
