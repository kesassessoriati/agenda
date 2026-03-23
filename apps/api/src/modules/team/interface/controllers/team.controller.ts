import type { Request, Response } from "express";

import { AppError } from "../../../../shared/errors/app-error.js";
import {
  acceptWorkspaceInvitation,
  createWorkspaceInvitation,
  getInvitationPreview,
  listInvitations,
  listMembers,
  revokeWorkspaceInvitation,
  updateMember,
} from "../../application/services/team.service.js";

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

export const teamController = {
  async listMembers(request: Request, response: Response) {
    const result = await listMembers(getAuth(request));
    return response.json(result);
  },

  async updateMember(request: Request, response: Response) {
    const result = await updateMember(getAuth(request), getParam(request.params.membershipId, "Membro"), request.body);
    return response.json(result);
  },

  async listInvitations(request: Request, response: Response) {
    const result = await listInvitations(getAuth(request));
    return response.json(result);
  },

  async createInvitation(request: Request, response: Response) {
    const result = await createWorkspaceInvitation(getAuth(request), request.body);
    return response.status(201).json(result);
  },

  async revokeInvitation(request: Request, response: Response) {
    const result = await revokeWorkspaceInvitation(getAuth(request), getParam(request.params.invitationId, "Convite"));
    return response.json(result);
  },

  async getInvitationPreview(request: Request, response: Response) {
    const result = await getInvitationPreview(getParam(request.params.token, "Convite"));
    return response.json(result);
  },

  async acceptInvitation(request: Request, response: Response) {
    const result = await acceptWorkspaceInvitation(getParam(request.params.token, "Convite"), request.body);
    return response.json(result);
  },
};
