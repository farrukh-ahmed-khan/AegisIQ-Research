import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CompanyWorkspaceTerminal } from "../../../components/workspace/company-workspace-terminal";
import { getWorkspaceTerminalViewModel } from "../../../lib/workspace-repository";
import styles from "./workspace-symbol.module.css";

interface WorkspacePageProps {
  params: Promise<{
    symbol: string;
  }>;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function isValidSymbol(symbol: string): boolean {
  return /^[A-Z0-9.\-]{1,12}$/.test(symbol);
}

export const dynamic = "force-dynamic";

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { userId } = await auth();

  if (!userId) {
    notFound();
  }

  const resolvedParams = await params;
  const symbol = normalizeSymbol(resolvedParams.symbol);

  if (!isValidSymbol(symbol)) {
    notFound();
  }

  const data = await getWorkspaceTerminalViewModel(userId, symbol);

  return (
    <main className={styles.page}>
      <div className={styles.glowBlue} />
      <div className={styles.glowGold} />
      <CompanyWorkspaceTerminal data={data} />
    </main>
  );
}
