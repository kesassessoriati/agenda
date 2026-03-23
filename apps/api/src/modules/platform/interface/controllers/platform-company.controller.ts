import type { Request, Response } from "express";

import { AppError } from "../../../../shared/errors/app-error.js";
import {
  createPlatformCompany,
  deletePlatformCompany,
  getPlatformCompanyDetails,
  listPlatformCompanies,
  updatePlatformCompany,
} from "../../application/services/platform-company.service.js";

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

export const platformCompanyController = {
  async list(request: Request, response: Response) {
    const result = await listPlatformCompanies(getAuth(request));
    return response.json(result);
  },

  async get(request: Request, response: Response) {
    const result = await getPlatformCompanyDetails(getAuth(request), getParam(request.params.companyId, "Empresa"));
    return response.json(result);
  },

  async create(request: Request, response: Response) {
    const result = await createPlatformCompany(getAuth(request), request.body);
    return response.status(201).json(result);
  },

  async update(request: Request, response: Response) {
    const result = await updatePlatformCompany(getAuth(request), getParam(request.params.companyId, "Empresa"), request.body);
    return response.json(result);
  },

  async remove(request: Request, response: Response) {
    const result = await deletePlatformCompany(getAuth(request), getParam(request.params.companyId, "Empresa"));
    return response.json(result);
  },
};
