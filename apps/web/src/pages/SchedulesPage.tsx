import AddRounded from "@mui/icons-material/AddRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import LinkOffRounded from "@mui/icons-material/LinkOffRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { ScheduleDialog } from "../components/ScheduleDialog";
import {
  createSchedule,
  deleteSchedule,
  disconnectGoogleCalendar,
  fetchAssignableUsers,
  fetchSchedules,
  getGoogleCalendarAuthUrl,
  updateSchedule,
} from "../services/schedules";
import { useAuthStore } from "../store/auth-store";
import { useUiStore } from "../store/ui-store";
import type { Schedule } from "../types";
import { getErrorMessage } from "../utils/error";
import { formatWorkingHoursSummary } from "../utils/format";

export function SchedulesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "ADMIN";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);

  const schedulesQuery = useQuery({
    queryKey: ["schedules"],
    queryFn: () => fetchSchedules(),
  });

  const usersQuery = useQuery({
    queryKey: ["assignable-users"],
    queryFn: fetchAssignableUsers,
  });

  const mutation = useMutation({
    mutationFn: async (payload: Parameters<typeof createSchedule>[0] & { id?: string }) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        return updateSchedule(id, rest);
      }
      return createSchedule(payload);
    },
    onSuccess: () => {
      showToast(selectedSchedule ? "Agenda atualizada." : "Agenda criada.", "success");
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setDialogOpen(false);
      setSelectedSchedule(null);
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      showToast("Agenda removida.", "success");
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setScheduleToDelete(null);
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const googleMutation = useMutation({
    mutationFn: getGoogleCalendarAuthUrl,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGoogleCalendar,
    onSuccess: () => {
      showToast("Integração Google removida da agenda.", "success");
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const summary = useMemo(
    () => ({
      total: (schedulesQuery.data?.schedules ?? []).length,
      active: (schedulesQuery.data?.schedules ?? []).filter((item) => item.active).length,
      linked: (schedulesQuery.data?.schedules ?? []).filter((item) => item.googleCalendarIntegration?.active).length,
    }),
    [schedulesQuery.data?.schedules],
  );

  return (
    <Stack spacing={3}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 0,
          background: "linear-gradient(135deg, #0f172a 0%, #134e4a 42%, #1d4ed8 100%)",
          color: "#fff",
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={1.5}>
              <Chip label="Agendas" sx={{ alignSelf: "flex-start", color: "#d1fae5", background: "rgba(255,255,255,0.12)" }} />
              <Typography variant="h3">Gerencie responsáveis, disponibilidade operacional e integração por agenda.</Typography>
              <Typography color="rgba(255,255,255,0.76)">
                Inspirado no módulo legado: cards de agenda, ativação, vínculos de usuários e acesso direto aos compromissos daquela agenda.
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={1.5}>
              <Button startIcon={<AddRounded />} variant="contained" color="secondary" onClick={() => setDialogOpen(true)}>
                Nova agenda
              </Button>
              <Button
                startIcon={<RefreshRounded />}
                variant="outlined"
                sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.32)" }}
                onClick={() => schedulesQuery.refetch()}
              >
                Atualizar
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        {[
          { label: "Total", value: summary.total },
          { label: "Ativas", value: summary.active },
          { label: "Com Google", value: summary.linked },
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
        {(schedulesQuery.data?.schedules ?? []).map((schedule) => (
          <Grid size={{ xs: 12, md: 6, xl: 4 }} key={schedule.id}>
            <Card sx={{ borderRadius: 0, overflow: "hidden" }}>
              <Box sx={{ height: 8, background: schedule.color }} />
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="h5">{schedule.name}</Typography>
                      <Typography color="text.secondary">{schedule.description || "Sem descrição operacional."}</Typography>
                    </Box>
                    <Chip
                      label={schedule.active ? "Ativa" : "Inativa"}
                      sx={{
                        fontWeight: 800,
                        background: schedule.active ? "rgba(5,150,105,0.14)" : "rgba(71,85,105,0.12)",
                        color: schedule.active ? "#047857" : "#475569",
                      }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    {schedule.assignments.map((assignment) => (
                      <Chip
                        key={assignment.id}
                        avatar={<Avatar sx={{ bgcolor: assignment.user.color || schedule.color }}>{assignment.user.name.slice(0, 1)}</Avatar>}
                        label={assignment.user.name}
                        variant="outlined"
                      />
                    ))}
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    {formatWorkingHoursSummary(schedule.workingHours)}
                  </Typography>

                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Google: {schedule.googleCalendarIntegration?.active ? schedule.googleCalendarIntegration.email : "não conectado"}
                    </Typography>
                    <Switch
                      checked={schedule.active}
                      onChange={(_, checked) =>
                        mutation.mutate({
                          ...schedule,
                          id: schedule.id,
                          active: checked,
                          assignedUserIds: schedule.assignments.map((item) => item.user.id),
                          workingHours: schedule.workingHours,
                        })
                      }
                    />
                  </Stack>

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button startIcon={<CalendarMonthRounded />} onClick={() => navigate(`/compromissos?scheduleId=${schedule.id}`)}>
                      Compromissos
                    </Button>
                    <Button
                      startIcon={schedule.googleCalendarIntegration?.active ? <LinkOffRounded /> : <LinkRounded />}
                      color={schedule.googleCalendarIntegration?.active ? "error" : "secondary"}
                      onClick={() =>
                        schedule.googleCalendarIntegration?.active
                          ? disconnectMutation.mutate(schedule.id)
                          : googleMutation.mutate(schedule.id)
                      }
                    >
                      Google
                    </Button>
                    <IconButton onClick={() => { setSelectedSchedule(schedule); setDialogOpen(true); }}>
                      <EditRounded />
                    </IconButton>
                    <IconButton color="error" onClick={() => setScheduleToDelete(schedule)}>
                      <DeleteOutlineRounded />
                    </IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {dialogOpen ? (
        <ScheduleDialog
          key={selectedSchedule?.id ?? "new-schedule"}
          open={dialogOpen}
          schedule={selectedSchedule}
          users={usersQuery.data?.users ?? []}
          isAdmin={Boolean(isAdmin)}
          submitting={mutation.isPending}
          onClose={() => {
            setDialogOpen(false);
            setSelectedSchedule(null);
          }}
          onSubmit={(values) =>
            mutation.mutate({
              id: selectedSchedule?.id,
              ...values,
              assignedUserIds: isAdmin ? values.assignedUserIds : [user?.id ?? ""].filter(Boolean),
            })
          }
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(scheduleToDelete)}
        title="Excluir agenda"
        description={`Deseja realmente excluir a agenda "${scheduleToDelete?.name}"? Todos os compromissos vinculados serão removidos.`}
        confirmLabel="Excluir agenda"
        onClose={() => setScheduleToDelete(null)}
        onConfirm={() => scheduleToDelete && deleteMutation.mutate(scheduleToDelete.id)}
      />
    </Stack>
  );
}
