"use client";

import { useEffect, useState } from "react";

export default function TerminalPage({ params }) {

  const ticker = params.ticker.toUpperCase();

  const [data, setData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {

    const res = await fetch(
      `/.netlify/functions/get-company-workspace?ticker=${ticker}`
    );

    const json = await res.json();

    setData(json);
  }

  if (!data) {
    return <div style={{ padding: 40 }}>Loading terminal...</div>;
  }

  return (

    <div style={{ padding: 40 }}>

      <h1>{ticker} Terminal</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 20 }}>

        {/* LEFT PANEL */}
        <div>

          <h3>Company</h3>

          <p>{data.profile.description}</p>

          <h4>Key Stats</h4>

          <p>Market Cap: {data.market.market_cap}</p>
          <p>Price: {data.market.price}</p>

        </div>

        {/* CENTER PANEL */}
        <div>

          <h3>Price Chart</h3>

          <div style={{ height: 300, background: "#eee" }} />

          <h3>Valuation</h3>

          <p>Target: {data.valuation.target_base}</p>
          <p>Rating: {data.valuation.rating}</p>

        </div>

        {/* RIGHT PANEL */}
        <div>

          <h3>AI Analyst</h3>

          <p>{data.ai.thesis}</p>

          <h4>Catalysts</h4>

          <ul>
            {data.ai.catalysts.map((c,i) => <li key={i}>{c}</li>)}
          </ul>

        </div>

      </div>

    </div>

  );
}
