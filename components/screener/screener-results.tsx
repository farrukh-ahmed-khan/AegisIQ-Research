"use client";

import type { ScreenerRunResponse, WatchlistOption } from "@/types/screener";

type ScreenerResultsProps = {
  response: ScreenerRunResponse | null;
  loading: boolean;
  watchlists: WatchlistOption[];
  addState: Record<string, string>;
  onAddToWatchlist: (symbol: string, watchlistId: string) => Promise<void>;
};

export function ScreenerResults({
  response,
  loading,
  watchlists,
  addState,
  onAddToWatchlist,
}: ScreenerResultsProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="text-sm text-slate-300">Running screener…</div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="text-sm text-slate-300">
          Configure filters and run the screener to view results.
        </div>
      </div>
    );
  }

  const hasResults = response.results.length > 0;
  const hasWatchlists = watchlists.length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Results</h2>
            <p className="mt-1 text-sm text-slate-300">{response.metadata.message}</p>
          </div>
          <div className="text-sm text-slate-400">
            {response.results.length} shown / {response.total} matched
          </div>
        </div>

        {response.metadata.unsupportedRequestedFilters.length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Unsupported filters ignored for this run:{" "}
            {response.metadata.unsupportedRequestedFilters.join(", ")}
          </div>
        ) : null}
      </div>

      {!hasResults ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300">
          No symbols matched the currently supported filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-slate-950/70">
                <tr className="text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Sector</th>
                  <th className="px-4 py-3 font-medium">Industry</th>
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium">Exchange</th>
                  <th className="px-4 py-3 font-medium">Market Cap</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">P/E</th>
                  <th className="px-4 py-3 font-medium">Watchlist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {response.results.map((row) => {
                  const state = addState[row.symbol];

                  return (
                    <tr key={row.symbol} className="text-slate-200">
                      <td className="px-4 py-3 font-semibold text-white">{row.symbol}</td>
                      <td className="px-4 py-3">{row.companyName ?? "—"}</td>
                      <td className="px-4 py-3">{row.sector ?? "—"}</td>
                      <td className="px-4 py-3">{row.industry ?? "—"}</td>
                      <td className="px-4 py-3">{row.country ?? "—"}</td>
                      <td className="px-4 py-3">{row.exchange ?? "—"}</td>
                      <td className="px-4 py-3">{row.marketCap ?? "—"}</td>
                      <td className="px-4 py-3">{row.price ?? "—"}</td>
                      <td className="px-4 py-3">{row.peRatio ?? "—"}</td>
                      <td className="px-4 py-3">
                        {hasWatchlists ? (
                          <div className="flex items-center gap-2">
                            <select
                              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                              defaultValue=""
                              onChange={async (event) => {
                                const watchlistId = event.target.value;
                                if (!watchlistId) return;
                                await onAddToWatchlist(row.symbol, watchlistId);
                                event.target.value = "";
                              }}
                            >
                              <option value="">Add…</option>
                              {watchlists.map((watchlist) => (
                                <option key={watchlist.id} value={watchlist.id}>
                                  {watchlist.name}
                                </option>
                              ))}
                            </select>
                            {state ? (
                              <span
                                className={
                                  state === "added"
                                    ? "text-xs text-emerald-300"
                                    : state === "error"
                                      ? "text-xs text-rose-300"
                                      : "text-xs text-slate-400"
                                }
                              >
                                {state === "added"
                                  ? "Added"
                                  : state === "error"
                                    ? "Failed"
                                    : "Saving…"}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">No watchlists</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
