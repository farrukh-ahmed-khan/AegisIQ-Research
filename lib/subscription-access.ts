type GenericRecord = Record<string, unknown>;

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function toRecord(value: unknown): GenericRecord {
  return value && typeof value === "object" ? (value as GenericRecord) : {};
}

function getNestedRecord(source: GenericRecord, key: string): GenericRecord {
  return toRecord(source[key]);
}

function getBoolean(source: GenericRecord, key: string): boolean | null {
  const value = source[key];
  return typeof value === "boolean" ? value : null;
}

function getString(source: GenericRecord, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

export function isStripeStatusActive(
  status: string | null | undefined,
): boolean {
  if (!status) return false;
  return ACTIVE_STATUSES.has(String(status).toLowerCase());
}

export function hasActiveSubscriptionFromClaims(claims: unknown): boolean {
  const root = toRecord(claims);

  const direct = getBoolean(root, "subscriptionActive");
  if (direct !== null) return direct;

  const metadata = getNestedRecord(root, "metadata");
  const metadataDirect = getBoolean(metadata, "subscriptionActive");
  if (metadataDirect !== null) return metadataDirect;

  const publicMetadata = getNestedRecord(root, "public_metadata");
  const publicDirect = getBoolean(publicMetadata, "subscriptionActive");
  if (publicDirect !== null) return publicDirect;

  const subscription = getNestedRecord(publicMetadata, "subscription");
  const subscriptionActive = getBoolean(subscription, "active");
  if (subscriptionActive !== null) return subscriptionActive;

  const status = getString(subscription, "status");
  return isStripeStatusActive(status);
}

export function hasActiveSubscriptionFromUserPublicMetadata(
  value: unknown,
): boolean {
  const publicMetadata = toRecord(value);

  const direct = getBoolean(publicMetadata, "subscriptionActive");
  if (direct !== null) return direct;

  const subscription = getNestedRecord(publicMetadata, "subscription");
  const subscriptionActive = getBoolean(subscription, "active");
  if (subscriptionActive !== null) return subscriptionActive;

  return isStripeStatusActive(getString(subscription, "status"));
}
