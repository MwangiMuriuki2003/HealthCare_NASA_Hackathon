import { NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api-auth";
import { type PrismaClientStub, prisma } from "@/lib/prisma";
import { AchievementType } from "@/types/schema";

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
    const achievements = await client.achievement.findMany({
      include: {
        astronaut: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { earnedAt: "desc" },
    });

    return NextResponse.json(achievements);
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Error fetching achievements:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth(request);
    const body = await request.json();
    const { astronautId, type } = body;

    if (!astronautId || !type) {
      return NextResponse.json(
        { error: "Missing required fields: astronautId, type" },
        { status: 400 }
      );
    }

    if (!Object.values(AchievementType).includes(type as AchievementType)) {
      return NextResponse.json(
        { error: "Invalid achievement type" },
        { status: 400 }
      );
    }

    const client = clientOr503();
    const achievement = await client.achievement.create({
      data: {
        astronautId,
        type: type as AchievementType,
      },
      include: {
        astronaut: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json(achievement, { status: 201 });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Error creating achievement:", error);
    return NextResponse.json(
      { error: "Failed to create achievement" },
      { status: 500 }
    );
  }
}