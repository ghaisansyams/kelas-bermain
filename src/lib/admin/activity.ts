"use server";

import { Prisma } from "@prisma/client";
import { getAdminSession } from "@/lib/admin/auth";
import { db } from "@/lib/db";

/**
 * Writes one audit row. Every admin action that changes data calls this, so
 * "who changed what, and what did it look like before" is answerable without
 * reading the application code.
 */
export async function logActivity(
  action: string,
  entity: string,
  entityId: string,
  oldValue: unknown,
  newValue: unknown,
): Promise<void> {
  const session = await getAdminSession();
  const json = (value: unknown) =>
    value === null || value === undefined ? Prisma.DbNull : (value as Prisma.InputJsonValue);

  await db.activity_logs.create({
    data: {
      user_id: session?.userId ?? null,
      action,
      entity,
      entity_id: entityId,
      old_value: json(oldValue),
      new_value: json(newValue),
    },
  });
}
