import type { Request, Response } from "express";

import { registerWorkspace } from "../../application/services/workspace.service.js";

export const workspaceController = {
  async register(request: Request, response: Response) {
    const result = await registerWorkspace(request.body);
    return response.status(201).json(result);
  },
};
