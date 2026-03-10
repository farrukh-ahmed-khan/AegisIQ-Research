import {
  querySecurityMaster,
} from "@/lib/security-master-repository";
import type {
  SecurityMasterFilters,
  SecurityMasterScreenerResult,
  SecurityType,
} from "@/lib/security-master-types";

type RunSecurityMasterScreenerQueryArgs = {
  workspaceId: string;
  filters: SecurityMasterFilters;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

function asSecurityTypeArray(value: unknown): SecurityType[] | undefined {
  const values = asStringArray(value);
  if (!values || values.length === 0) return undefined;

  const allowed = new Set<SecurityType>([
    "equity",
    "etf",
    "fund",
    "adr",
    "preferred",
    "other",
  ]);

  const items = values.filter(
    (item): item is SecurityType => allowed.has(item as SecurityType)
  );

  return items.length > 0 ? items : undefined;
}

export function normalizeSecurityMasterFilters(
  raw: Record<string, unknown>
): SecurityMasterFilters {
  return {
    query: asString(raw.query),
    sector: asStringArray(raw.sector),
    industry: asStringArray(raw.industry),
    exchange: asStringArray(raw.exchange),
    country: asStringArray(raw.country),
    currency: asStringArray(raw.currency),
    securityType: asSecurityTypeArray(raw.securityType),
    isActive: asBoolean(raw.isActive),
    limit: asNumber(raw.limit),
    offset: asNumber(raw.offset),
  };
}

export async function runSecurityMasterScreenerQuery(
  args: RunSecurityMasterScreenerQueryArgs
): Promise<SecurityMasterScreenerResult> {
  return querySecurityMaster(args.workspaceId, args.filters);
}
