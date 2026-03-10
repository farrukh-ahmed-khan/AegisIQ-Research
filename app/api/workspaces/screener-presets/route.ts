import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  createScreenerPreset,
  listScreenerPresets,
} from "@/lib/workspace-screener-repository";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

interface CreateScreenerPresetRequestBody {
  name?: unknown;
  description?: unknown;
  filters?: unknown;
  sort?: unknown;
  columns?: unknown;
  isDefault?: unknown;
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session.userId ?? null;
}

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await requireUserId();

    if (!userId) {
      return jsonError("Unauthorized", 401);
    }

    const presets = await listScreenerPresets(userId);

    return NextResponse.json({ presets });
  } catch (error) {
    console.error("Failed to list screener presets", error);
    return jsonError("Failed to load screener presets", 500);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireUserId();

    if (!userId) {
      return jsonError("Unauthorized", 401);
    }

    const body = (await request.json()) as CreateScreenerPresetRequestBody;

    if (typeof body.name !== "string") {
      return jsonError("Invalid preset name", 400);
    }

    if (!isJsonValue(body.filters)) {
      return jsonError("Invalid preset filters", 400);
    }

    if (body.sort !== undefined && !isJsonValue(body.sort)) {
      return jsonError("Invalid preset sort", 400);
    }

    if (body.columns !== undefined && !isJsonValue(body.columns)) {
      return jsonError("Invalid preset columns", 400);
    }

    if (body.description !== undefined && body.description !== null && typeof body.description !== "string") {
      return jsonError("Invalid preset description", 400);
    }

    if (body.isDefault !== undefined && typeof body.isDefault !== "boolean") {
      return jsonError("Invalid preset default flag", 400);
    }

    const preset = await createScreenerPreset(userId, {
      name: body.name,
      description: body.description as string | null | undefined,
      filters: body.filters,
      sort: (body.sort as JsonValue | null | undefined) ?? null,
      columns: (body.columns as JsonValue | null | undefined) ?? null,
      isDefault: body.isDefault as boolean | undefined,
    });

    return NextResponse.json({ preset }, { status: 201 });
  } catch (error) {
    console.error("Failed to create screener preset", error);

    if (error instanceof Error) {
      if (error.message === "name_required") {
        return jsonError("Preset name is required", 400);
      }

      if (error.message === "name_too_long") {
        return jsonError("Preset name is too long", 400);
      }
    }

    return jsonError("Failed to create screener preset", 500);
  }
}
