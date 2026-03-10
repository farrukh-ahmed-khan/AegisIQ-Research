export type SecurityType =
  | "equity"
  | "etf"
  | "fund"
  | "adr"
  | "preferred"
  | "other";

export type SecurityMasterRecord = {
  id: string;
  workspaceId: string;
  symbol: string;
  companyName: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  currency: string | null;
  securityType: SecurityType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SecurityMasterFilters = {
  query?: string;
  sector?: string[];
  industry?: string[];
  exchange?: string[];
  country?: string[];
  currency?: string[];
  securityType?: SecurityType[];
  isActive?: boolean;
  limit?: number;
  offset?: number;
};

export type SecurityMasterScreenerRow = {
  id: string;
  symbol: string;
  companyName: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  currency: string | null;
  securityType: SecurityType;
  isActive: boolean;
  source: "security_master";
};

export type SecurityMasterScreenerResult = {
  rows: SecurityMasterScreenerRow[];
  total: number;
};

export type SecurityMasterSupportedFilters = {
  sector: string[];
  industry: string[];
  exchange: string[];
  country: string[];
  currency: string[];
  securityType: string[];
};
