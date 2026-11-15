import { NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api-auth";
import { type PrismaClientStub, prisma } from "@/lib/prisma";
import { Metric } from "@/types/schema";

const MAX_LIMIT = 200;

async function requireAuth(request: Request): Promise<void> {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || !verifyApiKey(apiKey)) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

function prismaOrBadRequest() {
  if (!prisma) {
    throw new Response("Prisma client not available", { status: 503 });
  }
  return prisma;
}

export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const astronautId = searchParams.get("astronautId");
    const metric = searchParams.get("metric");
    const limitParam = searchParams.get("limit");
    const limit =
      limitParam != null
        ? Math.min(MAX_LIMIT, Math.max(1, parseInt(limitParam, 10) || 50))
        : 50;

    if (astronautId && metric && !Object.values(Metric).includes(metric as Metric)) {
      return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
    }

    const where =
      astronautId && metric
        ? { astronautId, metric: metric as Metric }
        : astronautId
          ? { astronautId }
          : undefined;

    const client = prismaOrBadRequest();
    const vitals = await client.vital.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      take: limit,
      include: {
        astronaut: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json(vitals);
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Error fetching vitals:", error);
    return NextResponse.json(
      { error: "Failed to fetch vitals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth(request);
    const body = await request.json();
    const { astronautId, metric, value, unit, source } = body;

    if (!astronautId || !metric || value === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: astronautId, metric, value" },
        { status: 400 }
      );
    }

    if (!Object.values(Metric).includes(metric as Metric)) {
      return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
    }

    const numericValue =
      typeof value === "number" && Number.isFinite(value)
        ? value
        : typeof value === "string"
          ? parseFloat(value)
          : NaN;

    if (!Number.isFinite(numericValue)) {
      return NextResponse.json(
        { error: "value must be a finite number" },
        { status: 400 }
      );
    }

    const client = prismaOrBadRequest();
    const vital = await client.vital.create({
      data: {
        astronautId,
        metric: metric as Metric,
        value: numericValue,
        unit: unit || "unknown",
        source: source || "MANUAL",
      },
      include: {
        astronaut: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json(vital, { status: 201 });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Error creating vital:", error);
    return NextResponse.json(
      { error: "Failed to create vital reading" },
      { status: 500 }
    );
  }
}
