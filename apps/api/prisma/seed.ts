import { AppointmentStatus, PrismaClient, ScheduleUserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import dayjs from "dayjs";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { slug: "kes-demo" },
    update: {},
    create: {
      slug: "kes-demo",
      name: "KES Demo",
      timezone: "America/Sao_Paulo",
      plan: "FREE",
    },
  });

  const adminPassword = await hash("admin123", 10);
  const memberPassword = await hash("user12345", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@kes.local" },
    update: {
      platformRole: "SUPERADMIN",
    },
    create: {
      name: "Administrador",
      email: "admin@kes.local",
      passwordHash: adminPassword,
      platformRole: "SUPERADMIN",
      color: "#0f172a",
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "consultor@kes.local" },
    update: {},
    create: {
      name: "Consultor Agenda",
      email: "consultor@kes.local",
      passwordHash: memberPassword,
      color: "#2563eb",
    },
  });

  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: admin.id,
      },
    },
    update: {
      role: "OWNER",
      active: true,
    },
    create: {
      companyId: company.id,
      userId: admin.id,
      role: "OWNER",
      active: true,
    },
  });

  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: member.id,
      },
    },
    update: {
      role: "MEMBER",
      active: true,
    },
    create: {
      companyId: company.id,
      userId: member.id,
      role: "MEMBER",
      active: true,
    },
  });

  const schedule = await prisma.schedule.upsert({
    where: { id: "schedule-seed-main" },
    update: {},
    create: {
      id: "schedule-seed-main",
      companyId: company.id,
      ownerId: admin.id,
      name: "Agenda Comercial",
      description: "Agenda principal para demos e alinhamentos com clientes.",
      active: true,
      color: "#2563eb",
      timezone: "America/Sao_Paulo",
    },
  });

  await prisma.scheduleUser.upsert({
    where: {
      scheduleId_userId: {
        scheduleId: schedule.id,
        userId: admin.id,
      },
    },
    update: { role: ScheduleUserRole.OWNER },
    create: {
      companyId: company.id,
      scheduleId: schedule.id,
      userId: admin.id,
      role: ScheduleUserRole.OWNER,
    },
  });

  await prisma.scheduleUser.upsert({
    where: {
      scheduleId_userId: {
        scheduleId: schedule.id,
        userId: member.id,
      },
    },
    update: { role: ScheduleUserRole.EDITOR },
    create: {
      companyId: company.id,
      scheduleId: schedule.id,
      userId: member.id,
      role: ScheduleUserRole.EDITOR,
    },
  });

  const workingHours = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", breakStart: "12:00", breakEnd: "13:00" },
    { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", breakStart: "12:00", breakEnd: "13:00" },
    { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", breakStart: "12:00", breakEnd: "13:00" },
    { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", breakStart: "12:00", breakEnd: "13:00" },
    { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", breakStart: "12:00", breakEnd: "13:00" },
  ];

  for (const item of workingHours) {
    await prisma.workingHours.upsert({
      where: {
        scheduleId_dayOfWeek: {
          scheduleId: schedule.id,
          dayOfWeek: item.dayOfWeek,
        },
      },
      update: item,
      create: {
        companyId: company.id,
        scheduleId: schedule.id,
        ...item,
      },
    });
  }

  const startAt = dayjs().hour(14).minute(0).second(0).millisecond(0).add(1, "day");
  await prisma.appointment.upsert({
    where: { id: "appointment-seed-demo" },
    update: {},
    create: {
      id: "appointment-seed-demo",
      companyId: company.id,
      scheduleId: schedule.id,
      title: "Reunião de descoberta",
      description: "Apresentação inicial do fluxo comercial.",
      startAt: startAt.toDate(),
      endAt: startAt.add(60, "minute").toDate(),
      durationMinutes: 60,
      status: AppointmentStatus.SCHEDULED,
      serviceName: "Demonstração",
      customerName: "Cliente Exemplo",
      customerEmail: "cliente@exemplo.com",
      organizerEmail: admin.email,
      participantEmails: [member.email],
      notes: "Confirmar material antes da chamada.",
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
