import { compare, hash } from "bcryptjs";
import { MembershipRole } from "@prisma/client";

import { createInvitationToken, hashInvitationToken } from "../../../../shared/auth/invitation-token.js";
import { buildAuthSession } from "../../../../shared/auth/session.js";
import { canAssignMembershipRole, canManageMembership, isWorkspaceAdmin, type AuthContext } from "../../../../shared/auth/context.js";
import { env, smtpEnabled } from "../../../../shared/config/env.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { prisma } from "../../../../shared/lib/prisma.js";
import { sendAccountCreatedEmail } from "../../../../shared/lib/mail.js";
import { acceptInvitationSchema, createInvitationSchema, createMemberDirectlySchema, updateMemberSchema } from "../dto/team.schemas.js";

function getInvitationStatus(invitation: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}) {
  if (invitation.acceptedAt) {
    return "ACCEPTED" as const;
  }

  if (invitation.revokedAt) {
    return "REVOKED" as const;
  }

  if (invitation.expiresAt < new Date()) {
    return "EXPIRED" as const;
  }

  return "PENDING" as const;
}

function assertWorkspaceAdminAccess(auth: AuthContext) {
  if (!isWorkspaceAdmin(auth.role)) {
    throw new AppError("Apenas administradores do workspace podem executar esta ação.", 403);
  }
}

async function ensureAnotherOwnerExists(companyId: string, membershipId: string) {
  const ownersCount = await prisma.membership.count({
    where: {
      companyId,
      active: true,
      role: "OWNER",
    },
  });

  if (ownersCount <= 1) {
    throw new AppError("Este workspace precisa manter pelo menos um owner ativo.", 409);
  }

  const currentMembership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { role: true },
  });

  if (currentMembership?.role !== "OWNER") {
    return;
  }
}

function serializeMember(member: {
  id: string;
  companyId: string;
  role: MembershipRole;
  active: boolean;
  joinedAt: Date;
  lastAccessedAt: Date | null;
  user: {
    id: string;
    name: string;
    email: string;
    color: string | null;
    timezone: string;
    active: boolean;
  };
}) {
  return {
    id: member.id,
    companyId: member.companyId,
    role: member.role,
    active: member.active,
    joinedAt: member.joinedAt,
    lastAccessedAt: member.lastAccessedAt,
    user: member.user,
  };
}

function serializeInvitation(invitation: {
  id: string;
  email: string;
  role: MembershipRole;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
  acceptedByUser: {
    id: string;
    name: string;
    email: string;
  } | null;
}) {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    revokedAt: invitation.revokedAt,
    createdAt: invitation.createdAt,
    status: getInvitationStatus(invitation),
    invitedBy: invitation.invitedBy,
    acceptedByUser: invitation.acceptedByUser,
  };
}

async function getInvitationByToken(token: string) {
  const tokenHash = hashInvitationToken(token);
  const invitation = await prisma.companyInvitation.findUnique({
    where: {
      tokenHash,
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          timezone: true,
        },
      },
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new AppError("Convite não encontrado.", 404);
  }

  return invitation;
}

export async function listMembers(auth: AuthContext) {
  assertWorkspaceAdminAccess(auth);

  const members = await prisma.membership.findMany({
    where: {
      companyId: auth.companyId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          color: true,
          timezone: true,
          active: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
  });

  return {
    members: members.map(serializeMember),
  };
}

export async function updateMember(auth: AuthContext, membershipId: string, input: unknown) {
  assertWorkspaceAdminAccess(auth);
  const payload = updateMemberSchema.parse(input);

  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      companyId: auth.companyId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          color: true,
          timezone: true,
          active: true,
        },
      },
    },
  });

  if (!membership) {
    throw new AppError("Membro do workspace não encontrado.", 404);
  }

  if (!canManageMembership(auth.role, membership.role)) {
    throw new AppError("Você não possui permissão para gerenciar este membro.", 403);
  }

  if (membership.id === auth.membershipId && (payload.active === false || payload.role !== undefined)) {
    throw new AppError("Use outro administrador para alterar ou desativar a sua própria membership.", 409);
  }

  if (payload.role && !canAssignMembershipRole(auth.role, payload.role)) {
    throw new AppError("Você não pode atribuir este papel no workspace.", 403);
  }

  if ((payload.active === false || (payload.role && payload.role !== "OWNER")) && membership.role === "OWNER") {
    await ensureAnotherOwnerExists(auth.companyId, membership.id);
  }

  const updated = await prisma.membership.update({
    where: { id: membership.id },
    data: {
      ...(payload.role ? { role: payload.role } : {}),
      ...(payload.active !== undefined ? { active: payload.active } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          color: true,
          timezone: true,
          active: true,
        },
      },
    },
  });

  return serializeMember(updated);
}

export async function listInvitations(auth: AuthContext) {
  assertWorkspaceAdminAccess(auth);

  const invitations = await prisma.companyInvitation.findMany({
    where: {
      companyId: auth.companyId,
    },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      acceptedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    invitations: invitations.map(serializeInvitation),
    emailDelivery: {
      configured: false,
      mode: "manual_link",
      note: "Nenhum provedor de e-mail foi encontrado no repositório; o convite deve ser entregue manualmente com o link seguro gerado.",
    },
  };
}

export async function createWorkspaceInvitation(auth: AuthContext, input: unknown) {
  assertWorkspaceAdminAccess(auth);
  const payload = createInvitationSchema.parse(input);
  const email = payload.email.trim().toLowerCase();

  if (!canAssignMembershipRole(auth.role, payload.role)) {
    throw new AppError("Você não pode convidar usuários com este papel.", 403);
  }

  const existingMembership = await prisma.membership.findFirst({
    where: {
      companyId: auth.companyId,
      active: true,
      user: {
        email,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingMembership) {
    throw new AppError("Este e-mail já possui acesso ativo ao workspace.", 409);
  }

  const rawToken = createInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = new Date(Date.now() + payload.expiresInDays * 24 * 60 * 60 * 1000);

  const invitation = await prisma.$transaction(async (tx) => {
    await tx.companyInvitation.updateMany({
      where: {
        companyId: auth.companyId,
        email,
        acceptedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return tx.companyInvitation.create({
      data: {
        companyId: auth.companyId,
        email,
        role: payload.role,
        tokenHash,
        invitedById: auth.userId,
        expiresAt,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        acceptedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  });

  return {
    invitation: serializeInvitation(invitation),
    delivery: {
      configured: false,
      mode: "manual_link",
      invitationUrl: `${env.WEB_URL}/convites/${rawToken}`,
      note: "Integração de e-mail não encontrada; copie e envie o link manualmente ao convidado.",
    },
  };
}

export async function revokeWorkspaceInvitation(auth: AuthContext, invitationId: string) {
  assertWorkspaceAdminAccess(auth);

  const invitation = await prisma.companyInvitation.findFirst({
    where: {
      id: invitationId,
      companyId: auth.companyId,
    },
  });

  if (!invitation) {
    throw new AppError("Convite não encontrado.", 404);
  }

  if (!canAssignMembershipRole(auth.role, invitation.role)) {
    throw new AppError("Você não pode revogar este convite.", 403);
  }

  if (invitation.acceptedAt) {
    throw new AppError("O convite já foi aceito e não pode mais ser revogado.", 409);
  }

  const revoked = await prisma.companyInvitation.update({
    where: {
      id: invitation.id,
    },
    data: {
      revokedAt: new Date(),
    },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      acceptedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return serializeInvitation(revoked);
}

export async function getInvitationPreview(token: string) {
  const invitation = await getInvitationByToken(token);
  const existingUser = await prisma.user.findUnique({
    where: {
      email: invitation.email,
    },
    select: {
      id: true,
      active: true,
    },
  });

  return {
    company: invitation.company,
    email: invitation.email,
    role: invitation.role,
    status: getInvitationStatus(invitation),
    expiresAt: invitation.expiresAt,
    inviter: invitation.invitedBy,
    existingUser: Boolean(existingUser?.active),
  };
}

export async function createMemberDirectly(auth: AuthContext, input: unknown) {
  assertWorkspaceAdminAccess(auth);
  const payload = createMemberDirectlySchema.parse(input);
  const email = payload.email.trim().toLowerCase();

  if (!canAssignMembershipRole(auth.role, payload.role)) {
    throw new AppError("Você não pode atribuir este papel no workspace.", 403);
  }

  const existingActiveMembership = await prisma.membership.findFirst({
    where: {
      companyId: auth.companyId,
      active: true,
      user: { email },
    },
    select: { id: true },
  });

  if (existingActiveMembership) {
    throw new AppError("Este e-mail já possui acesso ativo ao workspace.", 409);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser && !existingUser.active) {
    throw new AppError("Este usuário está desativado na plataforma e não pode ser adicionado.", 409);
  }

  const actorUser = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { name: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    const user = existingUser
      ? existingUser
      : await tx.user.create({
          data: {
            name: payload.name,
            email,
            passwordHash: await hash(payload.password, 10),
            timezone: "America/Sao_Paulo",
          },
        });

    const existingMembership = await tx.membership.findUnique({
      where: {
        companyId_userId: {
          companyId: auth.companyId,
          userId: user.id,
        },
      },
    });

    const membership = existingMembership
      ? await tx.membership.update({
          where: { id: existingMembership.id },
          data: {
            active: true,
            role: payload.role,
            invitedById: auth.userId,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                color: true,
                timezone: true,
                active: true,
              },
            },
          },
        })
      : await tx.membership.create({
          data: {
            companyId: auth.companyId,
            userId: user.id,
            role: payload.role,
            active: true,
            invitedById: auth.userId,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                color: true,
                timezone: true,
                active: true,
              },
            },
          },
        });

    return { membership, isNewUser: !existingUser };
  });

  let emailDelivery: {
    configured: boolean;
    sent: boolean;
    mode: string;
    note: string;
  };

  if (payload.sendEmail && smtpEnabled) {
    try {
      await sendAccountCreatedEmail({
        to: email,
        name: payload.name,
        email,
        password: existingUser ? "(use sua senha atual)" : payload.password,
        workspaceName: auth.company.name,
        loginUrl: `${env.WEB_URL}/login`,
        invitedByName: actorUser?.name ?? "Administrador",
      });
      emailDelivery = {
        configured: true,
        sent: true,
        mode: "smtp",
        note: "E-mail enviado com sucesso ao novo usuário.",
      };
    } catch {
      emailDelivery = {
        configured: true,
        sent: false,
        mode: "smtp",
        note: "SMTP configurado, mas ocorreu um erro ao enviar o e-mail. Compartilhe os dados de acesso manualmente.",
      };
    }
  } else if (payload.sendEmail && !smtpEnabled) {
    emailDelivery = {
      configured: false,
      sent: false,
      mode: "manual",
      note: "SMTP não configurado. Compartilhe os dados de acesso manualmente com o usuário.",
    };
  } else {
    emailDelivery = {
      configured: smtpEnabled,
      sent: false,
      mode: "manual",
      note: "Entrega manual selecionada. Compartilhe os dados de acesso diretamente com o usuário.",
    };
  }

  return {
    member: serializeMember(result.membership),
    isNewUser: result.isNewUser,
    delivery: emailDelivery,
  };
}

export async function acceptWorkspaceInvitation(token: string, input: unknown) {
  const payload = acceptInvitationSchema.parse(input);
  const invitation = await getInvitationByToken(token);
  const invitationStatus = getInvitationStatus(invitation);

  if (invitationStatus !== "PENDING") {
    throw new AppError("Este convite não está mais disponível para aceite.", 409);
  }

  const email = invitation.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    const passwordMatches = await compare(payload.password, existingUser.passwordHash);
    if (!passwordMatches) {
      throw new AppError("Senha inválida para vincular a conta existente ao workspace.", 401);
    }
  } else if (!payload.name) {
    throw new AppError("Informe o nome para criar a conta do convidado.", 422);
  }

  const result = await prisma.$transaction(async (tx) => {
    const user =
      existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              active: true,
              timezone: existingUser.timezone || payload.timezone,
              color: payload.color === undefined ? existingUser.color : payload.color,
            },
          })
        : await tx.user.create({
            data: {
              name: payload.name!,
              email,
              passwordHash: await hash(payload.password, 10),
              timezone: payload.timezone,
              color: payload.color ?? null,
            },
          });

    const existingMembership = await tx.membership.findUnique({
      where: {
        companyId_userId: {
          companyId: invitation.companyId,
          userId: user.id,
        },
      },
    });

    const membership =
      existingMembership
        ? await tx.membership.update({
            where: { id: existingMembership.id },
            data: {
              active: true,
              role: invitation.role,
              invitedById: invitation.invitedById,
              joinedAt: existingMembership.joinedAt ?? new Date(),
            },
          })
        : await tx.membership.create({
            data: {
              companyId: invitation.companyId,
              userId: user.id,
              role: invitation.role,
              active: true,
              invitedById: invitation.invitedById,
            },
          });

    await tx.companyInvitation.update({
      where: { id: invitation.id },
      data: {
        acceptedAt: new Date(),
        acceptedByUserId: user.id,
      },
    });

    await tx.companyInvitation.updateMany({
      where: {
        companyId: invitation.companyId,
        email,
        id: {
          not: invitation.id,
        },
        acceptedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      userId: user.id,
      membershipId: membership.id,
    };
  });

  return buildAuthSession(result.userId, result.membershipId);
}
