import { prisma } from "./prisma.js";
import { slugify } from "./slug.js";

export async function generateUniqueCompanySlug(baseValue: string, excludeCompanyId?: string) {
  const baseSlug = slugify(baseValue);
  let candidate = baseSlug;
  let index = 2;

  while (
    await prisma.company.findFirst({
      where: {
        slug: candidate,
        ...(excludeCompanyId ? { id: { not: excludeCompanyId } } : {}),
      },
      select: { id: true },
    })
  ) {
    candidate = `${baseSlug}-${index}`;
    index += 1;
  }

  return candidate;
}
