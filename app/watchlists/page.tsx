"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./watchlists.module.css";

type Watchlist = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
};

type WatchlistItem = {
  id: string;
  symbol: string;
  createdAt: string;
};

type WatchlistItemsMap = Record<string, WatchlistItem[]>;

const EMPTY_ITEMS: WatchlistItem[] = [];

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [itemsByWatchlistId, setItemsByWatchlistId] =
    useState<WatchlistItemsMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [createName, setCreateName] = useState<string>("");
  const [createDescription, setCreateDescription] = useState<string>("");
  const [createIsDefault, setCreateIsDefault] = useState<boolean>(false);

  const [newSymbols, setNewSymbols] = useState<Record<string, string>>({});
  const [editNames, setEditNames] = useState<Record<string, string>>({});
  const [editDescriptions, setEditDescriptions] = useState<
    Record<string, string>
  >({});

  const loadWatchlists = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/workspaces/watchlists", {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 401) {
        setErrorMessage("Please sign in to manage watchlists.");
        setWatchlists([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load watchlists (${response.status}).`);
      }

      const payload = (await response.json()) as { watchlists?: Watchlist[] };
      const nextWatchlists = Array.isArray(payload.watchlists)
        ? payload.watchlists
        : [];

      setWatchlists(nextWatchlists);

      const initialNames: Record<string, string> = {};
      const initialDescriptions: Record<string, string> = {};

      for (const watchlist of nextWatchlists) {
        initialNames[watchlist.id] = watchlist.name;
        initialDescriptions[watchlist.id] = watchlist.description ?? "";
      }

      setEditNames(initialNames);
      setEditDescriptions(initialDescriptions);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load watchlists.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadWatchlistItems = useCallback(async (watchlistId: string) => {
    try {
      const response = await fetch(
        `/api/workspaces/watchlists/${watchlistId}/items`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load watchlist items (${response.status}).`);
      }

      const payload = (await response.json()) as { items?: WatchlistItem[] };

      setItemsByWatchlistId((current) => ({
        ...current,
        [watchlistId]: Array.isArray(payload.items)
          ? payload.items
          : EMPTY_ITEMS,
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load watchlist items.";
      setErrorMessage(message);
    }
  }, []);

  const loadAllItems = useCallback(
    async (inputWatchlists: Watchlist[]) => {
      await Promise.all(
        inputWatchlists.map((watchlist) => loadWatchlistItems(watchlist.id)),
      );
    },
    [loadWatchlistItems],
  );

  useEffect(() => {
    void loadWatchlists();
  }, [loadWatchlists]);

  useEffect(() => {
    if (watchlists.length === 0) {
      setItemsByWatchlistId({});
      return;
    }

    void loadAllItems(watchlists);
  }, [loadAllItems, watchlists]);

  async function createWatchlist() {
    setErrorMessage("");
    setStatusMessage("");

    if (!createName.trim()) {
      setErrorMessage("Watchlist name is required.");
      return;
    }

    try {
      const response = await fetch("/api/workspaces/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDescription.trim() || null,
          isDefault: createIsDefault,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to create watchlist.");
      }

      setCreateName("");
      setCreateDescription("");
      setCreateIsDefault(false);
      setStatusMessage("Watchlist created.");
      await loadWatchlists();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create watchlist.";
      setErrorMessage(message);
    }
  }

  async function saveWatchlist(watchlistId: string) {
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await fetch(
        `/api/workspaces/watchlists/${watchlistId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: (editNames[watchlistId] ?? "").trim(),
            description: (editDescriptions[watchlistId] ?? "").trim() || null,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to update watchlist.");
      }

      setStatusMessage("Watchlist updated.");
      await loadWatchlists();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update watchlist.";
      setErrorMessage(message);
    }
  }

  async function makeDefaultWatchlist(watchlistId: string) {
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await fetch(
        `/api/workspaces/watchlists/${watchlistId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDefault: true }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to set default watchlist.");
      }

      setStatusMessage("Default watchlist updated.");
      await loadWatchlists();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to set default watchlist.";
      setErrorMessage(message);
    }
  }

  async function deleteWatchlistById(watchlistId: string) {
    setErrorMessage("");
    setStatusMessage("");

    const confirmed = window.confirm(
      "Delete this watchlist and all its items?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/workspaces/watchlists/${watchlistId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to delete watchlist.");
      }

      setStatusMessage("Watchlist deleted.");
      await loadWatchlists();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete watchlist.";
      setErrorMessage(message);
    }
  }

  async function addSymbol(watchlistId: string) {
    setErrorMessage("");
    setStatusMessage("");

    const symbol = normalizeSymbol(newSymbols[watchlistId] ?? "");

    if (!symbol) {
      setErrorMessage("Symbol is required.");
      return;
    }

    try {
      const response = await fetch(
        `/api/workspaces/watchlists/${watchlistId}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to add symbol.");
      }

      setNewSymbols((current) => ({ ...current, [watchlistId]: "" }));
      setStatusMessage(`${symbol} added.`);
      await loadWatchlistItems(watchlistId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add symbol.";
      setErrorMessage(message);
    }
  }

  async function removeSymbol(watchlistId: string, symbol: string) {
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await fetch(
        `/api/workspaces/watchlists/${watchlistId}/items/${encodeURIComponent(symbol)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to remove symbol.");
      }

      setStatusMessage(`${symbol} removed.`);
      await loadWatchlistItems(watchlistId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove symbol.";
      setErrorMessage(message);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.glowBlue} />
      <div className={styles.glowGold} />

      <div className={styles.container}>
        <h1 className={styles.heroTitle}>Watchlists</h1>
        <p className={styles.heroText}>
          Create, edit, and manage your watchlists directly from the app. You
          can set a default list and maintain symbols used in screener
          workflows.
        </p>

        <div className={styles.grid}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Create Watchlist</h2>
            <div className={styles.formRow}>
              <input
                className={styles.input}
                placeholder="Watchlist name"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
              />
              <input
                className={styles.input}
                placeholder="Description (optional)"
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
              />
              <select
                className={styles.select}
                value={createIsDefault ? "yes" : "no"}
                onChange={(event) =>
                  setCreateIsDefault(event.target.value === "yes")
                }
              >
                <option value="no">Not default</option>
                <option value="yes">Set as default</option>
              </select>
              <button
                className={styles.button}
                onClick={() => void createWatchlist()}
              >
                Create
              </button>
            </div>
          </section>

          {statusMessage ? (
            <p className={styles.status}>{statusMessage}</p>
          ) : null}
          {errorMessage ? (
            <p className={`${styles.status} ${styles.error}`}>{errorMessage}</p>
          ) : null}

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>
              Your Watchlists{" "}
              {isLoading ? "(Loading...)" : `(${watchlists.length})`}
            </h2>

            {watchlists.length === 0 && !isLoading ? (
              <p className={styles.muted}>
                No watchlists found. Create your first watchlist above.
              </p>
            ) : null}

            {watchlists.map((watchlist) => {
              const items = itemsByWatchlistId[watchlist.id] ?? EMPTY_ITEMS;

              return (
                <article key={watchlist.id} className={styles.watchlistCard}>
                  <section className={styles.panel}>
                    <div className={styles.formRow}>
                      <input
                        className={styles.input}
                        value={editNames[watchlist.id] ?? ""}
                        onChange={(event) =>
                          setEditNames((current) => ({
                            ...current,
                            [watchlist.id]: event.target.value,
                          }))
                        }
                      />
                      <input
                        className={styles.input}
                        value={editDescriptions[watchlist.id] ?? ""}
                        onChange={(event) =>
                          setEditDescriptions((current) => ({
                            ...current,
                            [watchlist.id]: event.target.value,
                          }))
                        }
                        placeholder="Description"
                      />
                      <button
                        className={styles.button}
                        onClick={() => void saveWatchlist(watchlist.id)}
                      >
                        Save
                      </button>
                      {!watchlist.isDefault ? (
                        <button
                          className={styles.buttonSecondary}
                          onClick={() =>
                            void makeDefaultWatchlist(watchlist.id)
                          }
                        >
                          Make Default
                        </button>
                      ) : (
                        <span className={styles.muted}>Default watchlist</span>
                      )}
                      <button
                        className={styles.buttonDanger}
                        onClick={() => void deleteWatchlistById(watchlist.id)}
                      >
                        Delete
                      </button>
                    </div>

                    <div className={styles.formRow} style={{ marginTop: 10 }}>
                      <input
                        className={styles.input}
                        placeholder="Add symbol (e.g. AAPL)"
                        value={newSymbols[watchlist.id] ?? ""}
                        onChange={(event) =>
                          setNewSymbols((current) => ({
                            ...current,
                            [watchlist.id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        className={styles.buttonSecondary}
                        onClick={() => void addSymbol(watchlist.id)}
                      >
                        Add Symbol
                      </button>
                    </div>

                    <ul className={styles.itemList}>
                      {items.map((item) => (
                        <li key={item.id} className={styles.itemRow}>
                          <div>
                            <span className={styles.symbol}>{item.symbol}</span>
                            <span className={styles.muted}>
                              {" "}
                              · Added{" "}
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <button
                            className={styles.buttonDanger}
                            onClick={() =>
                              void removeSymbol(watchlist.id, item.symbol)
                            }
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                      {items.length === 0 ? (
                        <li className={styles.muted}>No symbols yet.</li>
                      ) : null}
                    </ul>
                  </section>
                </article>
              );
            })}
          </section>
        </div>
      </div>
    </main>
  );
}
