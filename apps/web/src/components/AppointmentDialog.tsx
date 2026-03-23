import MeetingRoomRounded from "@mui/icons-material/MeetingRoomRounded";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import type { Appointment, AppointmentStatus, Schedule } from "../types";
import { formatDateTimeInput, serializeParticipantEmails, statusLabel } from "../utils/format";

type FormValues = {
  scheduleId: string;
  title: string;
  description: string;
  startAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  organizerEmail: string;
  participantEmails: string;
  meetingLink: string;
  notes: string;
};

type Props = {
  open: boolean;
  schedules: Schedule[];
  appointment?: Appointment | null;
  initialScheduleId?: string;
  defaultStartAt?: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    scheduleId: string;
    title: string;
    description?: string | null;
    startAt: string;
    durationMinutes: number;
    status: AppointmentStatus;
    serviceName?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
    organizerEmail?: string | null;
    participantEmails: string[];
    meetingLink?: string | null;
    notes?: string | null;
  }) => void;
};

const statusOptions: AppointmentStatus[] = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];

export function AppointmentDialog({ open, schedules, appointment, initialScheduleId, defaultStartAt, submitting, onClose, onSubmit }: Props) {
  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      scheduleId: "",
      title: "",
      description: "",
      startAt: "",
      durationMinutes: 60,
      status: "SCHEDULED",
      serviceName: "",
      customerName: "",
      customerEmail: "",
      organizerEmail: "",
      participantEmails: "",
      meetingLink: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      scheduleId: appointment?.scheduleId ?? initialScheduleId ?? schedules[0]?.id ?? "",
      title: appointment?.title ?? "",
      description: appointment?.description ?? "",
      startAt: formatDateTimeInput(appointment?.startAt ?? defaultStartAt ?? new Date()),
      durationMinutes: appointment?.durationMinutes ?? 60,
      status: appointment?.status ?? "SCHEDULED",
      serviceName: appointment?.serviceName ?? "",
      customerName: appointment?.customerName ?? "",
      customerEmail: appointment?.customerEmail ?? "",
      organizerEmail: appointment?.organizerEmail ?? "",
      participantEmails: appointment?.participantEmails.join(", ") ?? "",
      meetingLink: appointment?.meetingLink ?? "",
      notes: appointment?.notes ?? "",
    });
  }, [appointment, defaultStartAt, initialScheduleId, open, reset, schedules]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{appointment ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Controller
              name="title"
              control={control}
              rules={{ required: "Informe o título do compromisso." }}
              render={({ field, fieldState }) => (
                <TextField {...field} label="Título" fullWidth error={Boolean(fieldState.error)} helperText={fieldState.error?.message} />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Controller
              name="scheduleId"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Agenda" fullWidth select disabled={Boolean(appointment)}>
                  {schedules.map((schedule) => (
                    <MenuItem key={schedule.id} value={schedule.id}>
                      {schedule.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Controller name="description" control={control} render={({ field }) => <TextField {...field} label="Descrição" fullWidth multiline minRows={3} />} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Controller name="startAt" control={control} render={({ field }) => <TextField {...field} label="Início" type="datetime-local" fullWidth />} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Controller name="durationMinutes" control={control} render={({ field }) => <TextField {...field} label="Duração (min)" type="number" fullWidth />} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Status" fullWidth select>
                  {statusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {statusLabel(status)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Controller name="serviceName" control={control} render={({ field }) => <TextField {...field} label="Serviço" fullWidth />} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Controller name="customerName" control={control} render={({ field }) => <TextField {...field} label="Participante principal" fullWidth />} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Controller name="customerEmail" control={control} render={({ field }) => <TextField {...field} label="E-mail do participante" fullWidth />} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller name="organizerEmail" control={control} render={({ field }) => <TextField {...field} label="E-mail do organizador" fullWidth />} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller name="participantEmails" control={control} render={({ field }) => <TextField {...field} label="Participantes extras" placeholder="email1@..., email2@..." fullWidth />} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Controller name="meetingLink" control={control} render={({ field }) => <TextField {...field} label="Link da reunião" fullWidth />} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Controller name="notes" control={control} render={({ field }) => <TextField {...field} label="Notas operacionais" fullWidth multiline minRows={3} />} />
          </Grid>

          {appointment?.externalEventId ? (
            <Grid size={{ xs: 12 }}>
              <Alert icon={<MeetingRoomRounded fontSize="inherit" />} severity="info" sx={{ alignItems: "flex-start" }}>
                <Stack spacing={0.5}>
                  <Typography fontWeight={800}>Evento externo vinculado</Typography>
                  <Typography variant="body2">ID externo: {appointment.externalEventId}</Typography>
                  {appointment.meetingLink ? (
                    <Link href={appointment.meetingLink} target="_blank" rel="noreferrer" underline="hover">
                      Abrir reunião vinculada
                    </Link>
                  ) : null}
                </Stack>
              </Alert>
            </Grid>
          ) : null}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSubmit((values) =>
            onSubmit({
              scheduleId: values.scheduleId,
              title: values.title,
              description: values.description || null,
              startAt: new Date(values.startAt).toISOString(),
              durationMinutes: Number(values.durationMinutes),
              status: values.status,
              serviceName: values.serviceName || null,
              customerName: values.customerName || null,
              customerEmail: values.customerEmail || null,
              organizerEmail: values.organizerEmail || null,
              participantEmails: serializeParticipantEmails(values.participantEmails),
              meetingLink: values.meetingLink || null,
              notes: values.notes || null,
            }),
          )}
          variant="contained"
          disabled={submitting}
        >
          {appointment ? "Salvar compromisso" : "Criar compromisso"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
