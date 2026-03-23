import { api } from "../lib/api";
import type { AuthUser } from "../types";

export async function login(payload: { email: string; password: string; workspaceSlug?: string }) {
  const { data } = await api.post<{ token: string; user: AuthUser }>("/auth/login", payload);
  return data;
}

export async function registerWorkspace(payload: {
  companyName: string;
  companySlug?: string;
  timezone?: string;
  ownerName?: string;
  email: string;
  password: string;
}) {
  const { data } = await api.post<{ token: string; user: AuthUser }>("/workspaces/register", payload);
  return data;
}

export async function switchWorkspace(membershipId: string) {
  const { data } = await api.post<{ token: string; user: AuthUser }>("/auth/switch-workspace", { membershipId });
  return data;
}

export async function me() {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
}
