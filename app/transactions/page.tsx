"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./transactions.module.css";

type Txn = {
  id: string;
  number: string | null;
  status: string | null;
  currency: string;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  createdAt: string | null;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  subscriptionId: string | null;
};

export default function TransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState<Txn[]>([]);

  useEffect(() => {
    async function loadTransactions() {
      setLoading(true);
      setError("");

      const res = await fetch("/api/stripe/transactions", {
        method: "GET",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Unable to load transactions.");
        setLoading(false);
        return;
      }

      setTransactions(Array.isArray(json.transactions) ? json.transactions : []);
      setLoading(false);
    }

    loadTransactions();
  }, []);

  const totals = useMemo(() => {
    const totalPaid = transactions.reduce(
      (sum, item) => sum + (Number(item.amountPaid) || 0),
      0,
    );
    return { totalPaid };
  }, [transactions]);

  return (
    <main className={styles.page}>
      <div className={styles.glowBlue} />
      <div className={styles.glowGold} />

      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.badge}>Billing</div>
          <h1 className={styles.title}>Your Transactions</h1>
          <p className={styles.subtitle}>
            View your Stripe invoice and payment history for this account.
          </p>
        </section>

        <section className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Total Paid</p>
          <p className={styles.summaryValue}>{formatMoney(totals.totalPaid, "usd")}</p>
        </section>

        <section className={styles.tableCard}>
          {loading ? (
            <p className={styles.infoText}>Loading transactions...</p>
          ) : error ? (
            <p className={styles.errorText}>{error}</p>
          ) : transactions.length === 0 ? (
            <p className={styles.infoText}>No transactions found for this account.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Status</th>
                    <th>Paid</th>
                    <th>Created</th>
                    <th>Billing Period</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((item) => (
                    <tr key={item.id}>
                      <td>{item.number || item.id}</td>
                      <td>{item.status || "-"}</td>
                      <td>{formatMoney(item.amountPaid, item.currency)}</td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>
                        {formatDate(item.periodStart)} - {formatDate(item.periodEnd)}
                      </td>
                      <td>
                        {item.hostedInvoiceUrl ? (
                          <a href={item.hostedInvoiceUrl} target="_blank" rel="noreferrer">
                            Open
                          </a>
                        ) : item.invoicePdf ? (
                          <a href={item.invoicePdf} target="_blank" rel="noreferrer">
                            PDF
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function formatMoney(value: number, currency: string) {
  const amount = Number(value || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
