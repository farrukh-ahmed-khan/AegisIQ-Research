"use client";

import { useEffect, useState, use } from "react";

type Props = {
  params: Promise<{ ticker: string }>;
};

export default function TerminalPage({ params }: Props) {
  const { ticker } = use(params);
  const symbol = ticker.toUpperCase();

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const res = await fetch(
      `/.netlify/functions/get-company-workspace?ticker=${symbol}`,
    );

    const json = await res.json();
    setData(json);
  }

  if (!data) {
    return <div style={{ padding: 40 }}>Loading terminal...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>{symbol} Terminal</h1>
    </div>
  );
}
