import CancelRounded from "@mui/icons-material/CancelRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import TodayRounded from "@mui/icons-material/TodayRounded";
import ViewAgendaRounded from "@mui/icons-material/ViewAgendaRounded";
import ViewListRounded from "@mui/icons-material/ViewListRounded";
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { AppointmentDialog } from "../components/AppointmentDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { StatusChip } from "../components/StatusChip";
import {
  createAppointment,
  deleteAppointment,
  fetchAppointments,
  fetchAppointmentSummary,
  syncGoogleAppointments,
  updateAppointment,
} from "../services/appointments";
import { fetchSchedules } from "../services/schedules";
import { useUiStore } from "../store/ui-store";
import type { Appointment, AppointmentStatus } from "../types";
import { getErrorMessage } from "../utils/error";
import { formatDateInput, formatDateTime, formatDuration, statusLabel } from "../utils/format";

type ViewMode = "list" | "calendar";

export function AppointmentsPage() {
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const [searchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AppointmentStatus | "">("");
  const [scheduleId, setScheduleId] = useState(searchParams.get("scheduleId") ?? "");
  const [startDate, setStartDate] = useState(formatDateInput(new Date()));
  const [endDate, setEndDate] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [prefillStartAt, setPrefillStartAt] = useState<string | undefined>();

  const filters = useMemo(
    () => ({
      search: search || undefined,
      status: status || undefined,
      scheduleId: scheduleId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: 1,
      pageSize: 50,
    }),
    [endDate, scheduleId, search, startDate, status],
  );

  const schedulesQuery = useQuery({
    queryKey: ["schedules"],
    queryFn: () => fetchSchedules({ active: true }),
  });

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", filters],
    queryFn: () => fetchAppointments(filters),
  });

  const summaryQuery = useQuery({
    queryKey: ["appointments-summary", filters],
    queryFn: () => fetchAppointmentSummary(filters),
  });

  const mutation = useMutation({
    mutationFn: async (payload: Parameters<typeof createAppointment>[0] & { id?: string }) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        return updateAppointment(id, rest);
      }
      return createAppointment(payload);
    },
    onSuccess: () => {
      showToast(selectedAppointment ? "Compromisso atualizado." : "Compromisso criado.", "success");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-summary"] });
      setDialogOpen(false);
      setSelectedAppointment(null);
      setPrefillStartAt(undefined);
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status: nextStatus }: { id: string; status: AppointmentStatus }) => updateAppointment(id, { status: nextStatus }),
    onSuccess: () => {
      showToast("Status atualizado.", "success");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-summary"] });
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      showToast("Compromisso excluído.", "success");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-summary"] });
      setDeleteTarget(null);
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncGoogleAppointments(scheduleId || undefined),
    onSuccess: (data) => {
      showToast(`Sincronização concluída: ${data.imported} importados, ${data.updated} atualizados.`, "success");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-summary"] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const appointments = appointmentsQuery.data?.appointments ?? [];
  const stats = appointmentsQuery.data?.stats;
  const summary = summaryQuery.data;

  const calendarEvents = appointments.map((appointment) => ({
    id: appointment.id,
    title: appointment.title,
    start: appointment.startAt,
    end: appointment.endAt,
    backgroundColor:
      appointment.status === "CONFIRMED"
        ? "#059669"
        : appointment.status === "CANCELLED"
          ? "#dc2626"
          : appointment.status === "NO_SHOW"
            ? "#d97706"
            : appointment.status === "COMPLETED"
              ? "#475569"
              : appointment.schedule.color,
    borderColor: "transparent",
    extendedProps: { appointment },
  }));

  return (
    <Stack spacing={3}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 8,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 38%, #1d4ed8 100%)",
          color: "#fff",
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={1.5}>
              <Chip label="Compromissos" sx={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.12)", color: "#dbeafe" }} />
              <Typography variant="h3">Operação de agenda com leitura rápida, filtros e visão em calendário.</Typography>
              <Typography color="rgba(255,255,255,0.78)">
                Herdando o comportamento do módulo legado: resumo operacional, contexto por agenda/status/período, ações rápidas e sincronização manual.
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={1.5}>
              <Button startIcon={<EventAvailableRounded />} variant="contained" color="secondary" onClick={() => setDialogOpen(true)}>
                Novo compromisso
              </Button>
              <Button
                startIcon={<RefreshRounded />}
                variant="outlined"
                sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.32)" }}
                onClick={() => syncMutation.mutate()}
              >
                {syncMutation.isPending ? "Sincronizando..." : "Sincronizar Google"}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        {[
          { label: "Visíveis", value: stats?.total ?? 0 },
          { label: "Hoje", value: summary?.todayCount ?? 0 },
          { label: "Agendas ativas", value: summary?.schedulesCount ?? 0 },
          { label: "Agendas com Google", value: summary?.linkedSchedulesCount ?? 0 },
        ].map((item) => (
          <Grid size={{ xs: 12, md: 3 }} key={item.label}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 6 }}>
              <Typography color="text.secondary">{item.label}</Typography>
              <Typography variant="h3">{item.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 6 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField label="Buscar" value={search} onChange={(event) => setSearch(event.target.value)} fullWidth />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField select label="Agenda" value={scheduleId} onChange={(event) => setScheduleId(event.target.value)} fullWidth>
              <MenuItem value="">Todas</MenuItem>
              {(schedulesQuery.data?.schedules ?? []).map((schedule) => (
                <MenuItem key={schedule.id} value={schedule.id}>
                  {schedule.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField select label="Status" value={status} onChange={(event) => setStatus(event.target.value as AppointmentStatus | "")} fullWidth>
              <MenuItem value="">Todos</MenuItem>
              {(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as AppointmentStatus[]).map((item) => (
                <MenuItem key={item} value={item}>
                  {statusLabel(item)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField label="Data inicial" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} fullWidth />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField label="Data final" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} fullWidth />
          </Grid>
          <Grid size={{ xs: 12, md: 1 }}>
            <Button fullWidth sx={{ height: "100%" }} onClick={() => { setSearch(""); setStatus(""); setScheduleId(""); setStartDate(""); setEndDate(""); }}>
              Limpar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {summary?.nextAppointment ? (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 6, background: "linear-gradient(135deg, rgba(15,118,110,0.08), rgba(29,78,216,0.08))" }}>
          <Stack spacing={0.5}>
            <Typography color="text.secondary">Próximo compromisso</Typography>
            <Typography variant="h5">{summary.nextAppointment.title}</Typography>
            <Typography color="text.secondary">
              {formatDateTime(summary.nextAppointment.startAt)} • {summary.nextAppointment.schedule.name}
            </Typography>
          </Stack>
        </Paper>
      ) : null}

      <Paper elevation={0} sx={{ p: 3, borderRadius: 6 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} mb={3}>
          <Box>
            <Typography variant="h5">{viewMode === "list" ? "Lista operacional" : "Calendário operacional"}</Typography>
            <Typography color="text.secondary">{appointments.length} compromisso(s) carregado(s) no contexto atual.</Typography>
          </Box>
          <ButtonGroup>
            <Button startIcon={<ViewListRounded />} variant={viewMode === "list" ? "contained" : "outlined"} onClick={() => setViewMode("list")}>
              Lista
            </Button>
            <Button startIcon={<TodayRounded />} variant={viewMode === "calendar" ? "contained" : "outlined"} onClick={() => setViewMode("calendar")}>
              Calendário
            </Button>
            <Button startIcon={<ViewAgendaRounded />} variant="outlined" onClick={() => window.location.assign("/agendas")}>
              Agendas
            </Button>
          </ButtonGroup>
        </Stack>

        {viewMode === "calendar" ? (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            locale={ptBrLocale}
            events={calendarEvents}
            height="auto"
            headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" }}
            eventClick={(info) => {
              setSelectedAppointment(info.event.extendedProps.appointment as Appointment);
              setDialogOpen(true);
            }}
            dateClick={(info) => {
              setSelectedAppointment(null);
              setPrefillStartAt(info.dateStr);
              setDialogOpen(true);
            }}
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Compromisso</TableCell>
                <TableCell>Agenda</TableCell>
                <TableCell>Quando</TableCell>
                <TableCell>Duração</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id} hover>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={800}>{appointment.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {appointment.customerName || appointment.description || "Sem detalhe complementar."}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{appointment.schedule.name}</TableCell>
                  <TableCell>{formatDateTime(appointment.startAt)}</TableCell>
                  <TableCell>{formatDuration(appointment.durationMinutes)}</TableCell>
                  <TableCell>
                    <StatusChip status={appointment.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {appointment.status === "SCHEDULED" ? (
                        <Tooltip title="Confirmar">
                          <IconButton color="success" onClick={() => statusMutation.mutate({ id: appointment.id, status: "CONFIRMED" })}>
                            <CheckCircleRounded />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      {(appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED") ? (
                        <Tooltip title="Cancelar">
                          <IconButton color="error" onClick={() => statusMutation.mutate({ id: appointment.id, status: "CANCELLED" })}>
                            <CancelRounded />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      <Tooltip title="Editar">
                        <IconButton onClick={() => { setSelectedAppointment(appointment); setDialogOpen(true); }}>
                          <EditRounded />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton color="error" onClick={() => setDeleteTarget(appointment)}>
                          <DeleteOutlineRounded />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <AppointmentDialog
        open={dialogOpen}
        schedules={(schedulesQuery.data?.schedules ?? []).filter((schedule) => schedule.active || schedule.id === selectedAppointment?.scheduleId)}
        appointment={selectedAppointment}
        initialScheduleId={scheduleId || undefined}
        defaultStartAt={prefillStartAt}
        submitting={mutation.isPending}
        onClose={() => {
          setDialogOpen(false);
          setSelectedAppointment(null);
          setPrefillStartAt(undefined);
        }}
        onSubmit={(values) => mutation.mutate({ id: selectedAppointment?.id, ...values })}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir compromisso"
        description={`Deseja realmente excluir o compromisso "${deleteTarget?.title}"?`}
        confirmLabel="Excluir compromisso"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </Stack>
  );
}
