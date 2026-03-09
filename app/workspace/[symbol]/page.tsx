import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CompanyWorkspaceTerminal } from "@/components/workspace/company-workspace-terminal";
import type { CompanyWorkspaceTerminalViewModel } from "@/types/workspace";

interface WorkspacePageProps {
  params: {
    symbol: string;
  };
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function isValidSymbol(symbol: string): boolean {
  return /^[A-Z0-9.\-]{1,12}$/.test(symbol);
}

function buildInitialWorkspaceModel(symbol: string): CompanyWorkspaceTerminalViewModel {
  const now = new Date().toISOString();

  return {
    workspace: {
      symbol,
      companyName: null,
      exchange: null,
      coverageStatus: "active",
      primaryCurrency: "USD",
      lastPrice: null,
      lastPriceAt: null,
      latestRating: null,
      latestTargetPrice: null,
      updatedAt: now,
    },
    notes: [],
    documents: [],
    valuations: [],
    reports: [],
    activity: [],
  };
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { userId } = await auth();

  if (!userId) {
    notFound();
  }

  const symbol = normalizeSymbol(params.symbol);

  if (!isValidSymbol(symbol)) {
    notFound();
  }

  const initialData = buildInitialWorkspaceModel(symbol);

  return <CompanyWorkspaceTerminal data={initialData} />;
}
