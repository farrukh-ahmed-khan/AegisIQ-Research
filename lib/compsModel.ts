function buildComparableSet({ ticker, lastClose }) {
  const basePrice = num(lastClose) || 100;

  const comps = [
    {
      ticker: `${ticker}A`,
      company_name: "Peer Alpha",
      market_cap: basePrice * 150000000,
      ev_revenue: 4.8,
      ev_ebitda: 14.2,
      pe_ratio: 22.1,
    },
    {
      ticker: `${ticker}B`,
      company_name: "Peer Beta",
      market_cap: basePrice * 175000000,
      ev_revenue: 5.4,
      ev_ebitda: 15.8,
      pe_ratio: 24.3,
    },
    {
      ticker: `${ticker}C`,
      company_name: "Peer Gamma",
      market_cap: basePrice * 132000000,
      ev_revenue: 4.1,
      ev_ebitda: 12.9,
      pe_ratio: 19.7,
    },
  ];

  const averages = {
    ev_revenue:
      comps.reduce((sum, c) => sum + c.ev_revenue, 0) / comps.length,
    ev_ebitda:
      comps.reduce((sum, c) => sum + c.ev_ebitda, 0) / comps.length,
    pe_ratio:
      comps.reduce((sum, c) => sum + c.pe_ratio, 0) / comps.length,
  };

  return {
    comps,
    averages,
    commentary:
      "Comparable-company set is currently a placeholder framework. Replace with live peer data in the next market-data integration phase.",
  };
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export {
  buildComparableSet,
};
