import { NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api-auth";
import { type PrismaClientStub, prisma } from "@/lib/prisma";
import { ReminderType } from "@/types/schema";

async function requireAuth(request: Request): Promise<void> {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || !verifyApiKey(apiKey)) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

function clientOr503() {
  if (!prisma) {
    throw new Response("Prisma client not available", { status: 503 });
  }
  return prisma;
}

export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const client = clientOr503();
    const reminders = await client.reminder.findMany({
      where: { active: true },
      include: {
        astronaut: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reminders);
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Error fetching reminders:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth(request);
    const body = await request.json();
    const { astronautId, type, cronExpr, message } = body;

    if (!astronautId || !type || !cronExpr || !message) {
      return NextResponse.json(
        { error: "Missing required fields: astronautId, type, cronExpr, message" },
        { status: 400 }
      );
    }

    if (!Object.values(ReminderType).includes(type as ReminderType)) {
      return NextResponse.json(
        { error: "Invalid reminder type" },
        { status: 400 }
      );
    }

    const client = clientOr503();
    const reminder = await client.reminder.create({
      data: {
        astronautId,
        type: type as ReminderType,
        cronExpr,
        message,
        active: true,
      },
      include: {
        astronaut: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Error creating reminder:", error);
    return NextResponse.json(
      { error: "Failed to create reminder" },
      { status: 500 }
    );
  }
}