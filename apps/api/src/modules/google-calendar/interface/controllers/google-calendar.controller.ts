import type { Request, Response } from "express";

import { AppError } from "../../../../shared/errors/app-error.js";
import { getGoogleCalendarAuthUrl, handleGoogleCalendarCallback } from "../../application/services/google-calendar.service.js";

function getAuth(request: Request) {
  if (!request.auth) {
    throw new AppError("Sessão inválida.", 401);
  }

  return request.auth;
}

export const googleCalendarController = {
  async getAuthUrl(request: Request, response: Response) {
    const scheduleId = request.query.scheduleId;
    if (typeof scheduleId !== "string") {
      throw new AppError("Selecione uma agenda para conectar ao Google Calendar.", 422);
    }

    const url = await getGoogleCalendarAuthUrl(getAuth(request), scheduleId);
    return response.json({ url });
  },

  async callback(request: Request, response: Response) {
    const code = request.query.code;
    const state = request.query.state;

    if (typeof code !== "string" || typeof state !== "string") {
      throw new AppError("Callback do Google Calendar inválido.", 422);
    }

    const redirectUrl = await handleGoogleCalendarCallback(code, state);
    return response.redirect(redirectUrl);
  },
};
