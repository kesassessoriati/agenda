import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import type { Schedule, UserOption, WorkingHour } from "../types";
import { buildDefaultWorkingHours, weekDayLabels } from "../utils/format";

type FormValues = {
  name: string;
  description: string;
  active: boolean;
  color: string;
  timezone: string;
  ownerId: string;
  assignedUserIds: string[];
};

type Props = {
  open: boolean;
  schedule?: Schedule | null;
  users: UserOption[];
  isAdmin: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: FormValues & { workingHours: WorkingHour[] }) => void;
};

export function ScheduleDialog({ open, schedule, users, isAdmin, submitting, onClose, onSubmit }: Props) {
  const initialWorkingHours = schedule?.workingHours.length ? schedule.workingHours : buildDefaultWorkingHours();
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(initialWorkingHours);
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      name: schedule?.name ?? "",
      description: schedule?.description ?? "",
      active: schedule?.active ?? true,
      color: schedule?.color ?? "#2563eb",
      timezone: schedule?.timezone ?? "America/Sao_Paulo",
      ownerId: schedule?.ownerId ?? users[0]?.id ?? "",
      assignedUserIds: schedule?.assignments.map((item) => item.user.id) ?? [],
    },
  });

  const selectedUsers = useWatch({
    control,
    name: "assignedUserIds",
  }) ?? [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{schedule ? "Editar agenda" : "Nova agenda"}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Controller
              name="name"
              control={control}
              rules={{ required: "Informe o nome da agenda." }}
              render={({ field, fieldState }) => (
                <TextField {...field} label="Nome" fullWidth error={Boolean(fieldState.error)} helperText={fieldState.error?.message} />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Controller name="color" control={control} render={({ field }) => <TextField {...field} type="color" label="Cor" fullWidth />} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => <TextField {...field} label="Descrição" fullWidth multiline minRows={3} />}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller name="timezone" control={control} render={({ field }) => <TextField {...field} label="Timezone" fullWidth />} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormControlLabel control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label="Agenda ativa" />
              )}
            />
          </Grid>

          {isAdmin ? (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="ownerId"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Responsável principal" fullWidth select>
                      {users.map((user) => (
                        <MenuItem key={user.id} value={user.id}>
                          {user.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="assignedUserIds"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Usuários vinculados</InputLabel>
                      <Select
                        {...field}
                        multiple
                        input={<OutlinedInput label="Usuários vinculados" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                            {(selected as string[]).map((userId) => {
                              const user = users.find((item) => item.id === userId);
                              return <Chip key={userId} label={user?.name ?? userId} size="small" />;
                            })}
                          </Box>
                        )}
                      >
                        {users.map((user) => (
                          <MenuItem key={user.id} value={user.id}>
                            <Checkbox checked={field.value.includes(user.id)} />
                            {user.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            </>
          ) : (
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="text.secondary">
                Você pode manter dados operacionais da agenda, mas a lista de responsáveis segue o seu acesso atual.
              </Typography>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <Box sx={{ p: 2.5, borderRadius: 0, background: "rgba(15, 23, 42, 0.03)" }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Jornada da agenda
              </Typography>
              <Stack spacing={1.5}>
                {workingHours.map((item, index) => (
                  <Grid container spacing={1.5} key={item.dayOfWeek} alignItems="center">
                    <Grid size={{ xs: 12, md: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={item.active}
                            onChange={(_, checked) =>
                              setWorkingHours((current) =>
                                current.map((hour, hourIndex) => (hourIndex === index ? { ...hour, active: checked } : hour)),
                              )
                            }
                          />
                        }
                        label={weekDayLabels[item.dayOfWeek]}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField
                        label="Início"
                        type="time"
                        fullWidth
                        value={item.startTime}
                        onChange={(event) =>
                          setWorkingHours((current) =>
                            current.map((hour, hourIndex) => (hourIndex === index ? { ...hour, startTime: event.target.value } : hour)),
                          )
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField
                        label="Fim"
                        type="time"
                        fullWidth
                        value={item.endTime}
                        onChange={(event) =>
                          setWorkingHours((current) =>
                            current.map((hour, hourIndex) => (hourIndex === index ? { ...hour, endTime: event.target.value } : hour)),
                          )
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <TextField
                        label="Pausa início"
                        type="time"
                        fullWidth
                        value={item.breakStart ?? ""}
                        onChange={(event) =>
                          setWorkingHours((current) =>
                            current.map((hour, hourIndex) =>
                              hourIndex === index ? { ...hour, breakStart: event.target.value || null } : hour,
                            ),
                          )
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <TextField
                        label="Pausa fim"
                        type="time"
                        fullWidth
                        value={item.breakEnd ?? ""}
                        onChange={(event) =>
                          setWorkingHours((current) =>
                            current.map((hour, hourIndex) =>
                              hourIndex === index ? { ...hour, breakEnd: event.target.value || null } : hour,
                            ),
                          )
                        }
                      />
                    </Grid>
                  </Grid>
                ))}
              </Stack>
            </Box>
          </Grid>

          {selectedUsers.length > 0 ? (
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="text.secondary">
                Responsáveis vinculados: {selectedUsers.length}
              </Typography>
            </Grid>
          ) : null}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit((values) => onSubmit({ ...values, workingHours }))} variant="contained" disabled={submitting}>
          {schedule ? "Salvar agenda" : "Criar agenda"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
