import type { Request, Response } from "express";

import { AppError } from "../../../../shared/errors/app-error.js";
import {
  createAppointment,
  deleteAppointment,
  getAppointment,
  getAppointmentsSummary,
  listAppointments,
  syncAppointmentsFromGoogle,
  updateAppointment,
} from "../../application/use-cases/appointment.service.js";

function getAuth(request: Request) {
  if (!request.auth) {
    throw new AppError("Sessão inválida.", 401);
  }

  return request.auth;
}

function getParam(value: string | string[] | undefined, label: string) {
  if (typeof value !== "string") {
    throw new AppError(`${label} inválido.`, 422);
  }

  return value;
}

export const appointmentController = {
  async list(request: Request, response: Response) {
    const result = await listAppointments(getAuth(request), request.query);
    return response.json(result);
  },

  async summary(request: Request, response: Response) {
    const result = await getAppointmentsSummary(getAuth(request), request.query);
    return response.json(result);
  },

  async get(request: Request, response: Response) {
    const result = await getAppointment(getAuth(request), getParam(request.params.appointmentId, "Compromisso"));
    return response.json(result);
  },

  async create(request: Request, response: Response) {
    const result = await createAppointment(getAuth(request), request.body);
    return response.status(201).json(result);
  },

  async update(request: Request, response: Response) {
    const result = await updateAppointment(
      getAuth(request),
      getParam(request.params.appointmentId, "Compromisso"),
      request.body,
    );
    return response.json(result);
  },

  async remove(request: Request, response: Response) {
    const result = await deleteAppointment(getAuth(request), getParam(request.params.appointmentId, "Compromisso"));
    return response.json(result);
  },

  async syncGoogle(request: Request, response: Response) {
    const scheduleId = typeof request.body?.scheduleId === "string" ? request.body.scheduleId : undefined;
    const result = await syncAppointmentsFromGoogle(getAuth(request), scheduleId);
    return response.json(result);
  },
};
