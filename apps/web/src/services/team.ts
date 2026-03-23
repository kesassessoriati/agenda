import { api } from "../lib/api";
import type { AuthUser, Invitation, InvitationPreview, TeamMember, WorkspaceRole } from "../types";

export async function createMemberDirectly(payload: {
  name: string;
  email: string;
  password: string;
  role: WorkspaceRole;
  sendEmail: boolean;
}) {
  const { data } = await api.post<{
    member: TeamMember;
    isNewUser: boolean;
    delivery: {
      configured: boolean;
      sent: boolean;
      mode: string;
      note: string;
    };
  }>("/team/members", payload);
  return data;
}

export async function fetchTeamMembers() {
  const { data } = await api.get<{ members: TeamMember[] }>("/team/members");
  return data;
}

export async function updateTeamMember(membershipId: string, payload: { role?: WorkspaceRole; active?: boolean }) {
  const { data } = await api.patch<TeamMember>(`/team/members/${membershipId}`, payload);
  return data;
}

export async function fetchTeamInvitations() {
  const { data } = await api.get<{
    invitations: Invitation[];
    emailDelivery: {
      configured: boolean;
      mode: string;
      note: string;
    };
  }>("/team/invitations");
  return data;
}

export async function createTeamInvitation(payload: { email: string; role: WorkspaceRole; expiresInDays?: number }) {
  const { data } = await api.post<{
    invitation: Invitation;
    delivery: {
      configured: boolean;
      mode: string;
      invitationUrl: string;
      note: string;
    };
  }>("/team/invitations", payload);
  return data;
}

export async function revokeTeamInvitation(invitationId: string) {
  const { data } = await api.delete<Invitation>(`/team/invitations/${invitationId}`);
  return data;
}

export async function fetchInvitationPreview(token: string) {
  const { data } = await api.get<InvitationPreview>(`/workspace-invitations/${token}`);
  return data;
}

export async function acceptInvitation(
  token: string,
  payload: { name?: string; password: string; timezone?: string; color?: string | null },
) {
  const { data } = await api.post<{ token: string; user: AuthUser }>(`/workspace-invitations/${token}/accept`, payload);
  return data;
}
