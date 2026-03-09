async function getCompanyProfile(ticker) {
  const url = `${process.env.MARKET_DATA_BASE_URL}/profile/${encodeURIComponent(
    ticker
  )}?apikey=${encodeURIComponent(process.env.MARKET_DATA_API_KEY || "")}`;

  const data = await getJson(url);
  const row = Array.isArray(data) ? data[0] : data;

  return {
    ticker: ticker.toUpperCase(),
    company_name: row?.companyName || row?.name || null,
    sector: row?.sector || null,
    industry: row?.industry || null,
    exchange: row?.exchange || row?.exchangeShortName || null,
    currency: row?.currency || "USD",
    market_cap: toNumber(row?.marketCap),
    description: row?.description || null,
    website: row?.website || null,
  };
}

async function getLiveQuote(ticker) {
  const url = `${process.env.MARKET_DATA_BASE_URL}/quote/${encodeURIComponent(
    ticker
  )}?apikey=${encodeURIComponent(process.env.MARKET_DATA_API_KEY || "")}`;

  const data = await getJson(url);
  const row = Array.isArray(data) ? data[0] : data;

  return {
    ticker: ticker.toUpperCase(),
    price: toNumber(row?.price),
    change_pct: toNumber(
      row?.changesPercentage ?? row?.changePercent ?? row?.percent_change
    ),
    volume: toNumber(row?.volume),
    previous_close: toNumber(row?.previousClose),
    day_high: toNumber(row?.dayHigh ?? row?.high),
    day_low: toNumber(row?.dayLow ?? row?.low),
  };
}

async function getPeerTickers(ticker) {
  const url = `${process.env.MARKET_DATA_BASE_URL}/peers/${encodeURIComponent(
    ticker
  )}?apikey=${encodeURIComponent(process.env.MARKET_DATA_API_KEY || "")}`;

  const data = await getJson(url);

  if (Array.isArray(data)) {
    if (data.length && typeof data[0] === "string") return data.slice(0, 6);
    if (data.length && Array.isArray(data[0]?.peersList)) return data[0].peersList.slice(0, 6);
    if (data.length && Array.isArray(data[0]?.peers)) return data[0].peers.slice(0, 6);
  }

  if (Array.isArray(data?.peersList)) return data.peersList.slice(0, 6);
  if (Array.isArray(data?.peers)) return data.peers.slice(0, 6);

  return [];
}

async function getPeerProfiles(ticker) {
  const peers = await getPeerTickers(ticker);
  const uniquePeers = peers
    .filter(Boolean)
    .map((p) => String(p).toUpperCase())
    .filter((p) => p !== String(ticker).toUpperCase())
    .slice(0, 5);

  const results = [];
  for (const peerTicker of uniquePeers) {
    try {
      const profile = await getCompanyProfile(peerTicker);
      results.push({
        peer_ticker: peerTicker,
        peer_name: profile.company_name,
        peer_sector: profile.sector,
        peer_industry: profile.industry,
        peer_market_cap: profile.market_cap,
      });
    } catch (error) {
      results.push({
        peer_ticker: peerTicker,
        peer_name: null,
        peer_sector: null,
        peer_industry: null,
        peer_market_cap: null,
      });
    }
  }

  return results;
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Market data request failed: ${res.status}`);
  }

  return res.json();
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

module.exports = {
  getCompanyProfile,
  getLiveQuote,
  getPeerTickers,
  getPeerProfiles,
};
