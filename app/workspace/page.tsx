import Link from "next/link";
import { sql } from "@/lib/db";
import styles from "./workspace.module.css";

interface WorkspaceIndexProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

const PAGE_SIZE = 60;

async function fetchSecurities(
  search: string,
  page: number,
): Promise<{ symbol: string; companyName: string | null; exchange: string | null; sector: string | null }[]> {
  const offset = (page - 1) * PAGE_SIZE;
  const term = search.trim();

  try {
    if (term) {
      const rows = await sql<{ symbol: string; company_name: string | null; exchange: string | null; sector: string | null }[]>`
        SELECT symbol, company_name, exchange, sector
        FROM securities
        WHERE
          symbol ILIKE ${"%" + term.toUpperCase() + "%"}
          OR company_name ILIKE ${"%" + term + "%"}
        ORDER BY symbol ASC
        LIMIT ${PAGE_SIZE}
        OFFSET ${offset}
      `;
      return rows.map((r) => ({ symbol: r.symbol, companyName: r.company_name, exchange: r.exchange, sector: r.sector }));
    }

    const rows = await sql<{ symbol: string; company_name: string | null; exchange: string | null; sector: string | null }[]>`
      SELECT symbol, company_name, exchange, sector
      FROM securities
      ORDER BY symbol ASC
      LIMIT ${PAGE_SIZE}
      OFFSET ${offset}
    `;
    return rows.map((r) => ({ symbol: r.symbol, companyName: r.company_name, exchange: r.exchange, sector: r.sector }));
  } catch {
    return [];
  }
}

async function countSecurities(search: string): Promise<number> {
  const term = search.trim();
  try {
    if (term) {
      const rows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count
        FROM securities
        WHERE
          symbol ILIKE ${"%" + term.toUpperCase() + "%"}
          OR company_name ILIKE ${"%" + term + "%"}
      `;
      return parseInt(rows[0]?.count ?? "0", 10);
    }
    const rows = await sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM securities`;
    return parseInt(rows[0]?.count ?? "0", 10);
  } catch {
    return 0;
  }
}

export const dynamic = "force-dynamic";

export default async function WorkspaceIndexPage({ searchParams }: WorkspaceIndexProps) {
  const { q = "", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10) || 1);

  const [securities, total] = await Promise.all([
    fetchSecurities(q, page),
    countSecurities(q),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const buildHref = (p: number) =>
    `/workspace?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${p}`;

  return (
    <main className={styles.page}>
      <div className={styles.glowBlue} />
      <div className={styles.glowGold} />

      <div className={styles.container}>
        <div className={styles.panel}>
          <div className={styles.badge}>AegisIQ Workspace</div>

          <h1 className={styles.title}>Company Workspace Terminal</h1>

          <p className={styles.subtitle}>
            Open a symbol-specific terminal to manage research notes, linked
            documents, valuation snapshots, and report generation from a single
            workspace.
          </p>

          {/* Search */}
          <form method="GET" action="/workspace" className={styles.searchForm}>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by symbol or company name…"
              className={styles.searchInput}
              autoComplete="off"
            />
            <button type="submit" className={styles.searchButton}>
              Search
            </button>
            {q ? (
              <Link href="/workspace" className={styles.clearLink}>
                Clear
              </Link>
            ) : null}
          </form>

          {/* Results count */}
          <div className={styles.resultsBar}>
            {total > 0 ? (
              <span className={styles.resultsCount}>
                {total.toLocaleString()} securit{total === 1 ? "y" : "ies"}
                {q ? ` matching "${q}"` : ""}
                {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
              </span>
            ) : (
              <span className={styles.resultsCount}>No results found</span>
            )}
          </div>

          {/* Symbol grid */}
          {securities.length > 0 ? (
            <div className={styles.symbolGrid}>
              {securities.map((s) => (
                <Link
                  key={s.symbol}
                  href={`/workspace/${s.symbol}`}
                  className={styles.symbolCard}
                >
                  <span className={styles.symbolTicker}>{s.symbol}</span>
                  {s.companyName ? (
                    <span className={styles.symbolName}>{s.companyName}</span>
                  ) : null}
                  {s.exchange ? (
                    <span className={styles.symbolMeta}>{s.exchange}{s.sector ? ` · ${s.sector}` : ""}</span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>No securities found</p>
              <p className={styles.emptyText}>
                {q
                  ? `No results for "${q}". Try a different symbol or company name.`
                  : "No securities found. Make sure the security master is loaded."}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className={styles.pagination}>
              {hasPrev ? (
                <Link href={buildHref(page - 1)} className={styles.pageBtn}>
                  ← Prev
                </Link>
              ) : (
                <span className={styles.pageBtnDisabled}>← Prev</span>
              )}
              <span className={styles.pageInfo}>
                {page} / {totalPages}
              </span>
              {hasNext ? (
                <Link href={buildHref(page + 1)} className={styles.pageBtn}>
                  Next →
                </Link>
              ) : (
                <span className={styles.pageBtnDisabled}>Next →</span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
