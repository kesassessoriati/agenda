import type { Request, Response } from "express";

import { AppError } from "../../../../shared/errors/app-error.js";
import {
  createSchedule,
  deleteSchedule,
  getSchedule,
  listSchedules,
  unlinkGoogleCalendar,
  updateSchedule,
} from "../../application/use-cases/schedule.service.js";

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

export const scheduleController = {
  async list(request: Request, response: Response) {
    const result = await listSchedules(getAuth(request), request.query);
    return response.json(result);
  },

  async get(request: Request, response: Response) {
    const result = await getSchedule(getAuth(request), getParam(request.params.scheduleId, "Agenda"));
    return response.json(result);
  },

  async create(request: Request, response: Response) {
    const result = await createSchedule(getAuth(request), request.body);
    return response.status(201).json(result);
  },

  async update(request: Request, response: Response) {
    const result = await updateSchedule(getAuth(request), getParam(request.params.scheduleId, "Agenda"), request.body);
    return response.json(result);
  },

  async remove(request: Request, response: Response) {
    const result = await deleteSchedule(getAuth(request), getParam(request.params.scheduleId, "Agenda"));
    return response.json(result);
  },

  async unlinkGoogle(request: Request, response: Response) {
    const result = await unlinkGoogleCalendar(getAuth(request), getParam(request.params.scheduleId, "Agenda"));
    return response.json(result);
  },
};
