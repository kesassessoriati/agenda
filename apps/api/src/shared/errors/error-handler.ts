import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError } from "./app-error.js";
import { logger } from "../lib/logger.js";

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return response.status(422).json({
      message: "Falha de validação.",
      issues: error.flatten(),
    });
  }

  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  logger.error({ error }, "Unexpected request error");

  return response.status(500).json({
    message: "Erro interno do servidor.",
  });
}
