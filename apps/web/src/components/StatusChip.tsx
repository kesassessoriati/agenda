import { Chip } from "@mui/material";

import type { AppointmentStatus } from "../types";
import { statusColor, statusLabel } from "../utils/format";

type Props = {
  status: AppointmentStatus;
};

export function StatusChip({ status }: Props) {
  return (
    <Chip
      label={statusLabel(status)}
      size="small"
      sx={{
        backgroundColor: `${statusColor(status)}18`,
        color: statusColor(status),
        border: `1px solid ${statusColor(status)}33`,
        fontWeight: 800,
      }}
    />
  );
}
