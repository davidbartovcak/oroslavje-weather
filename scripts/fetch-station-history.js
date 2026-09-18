#!/usr/bin/env node
// Fetches 24h station history from pljusak.com for each configured station
// and writes each to its own station-history-<location>.json. This runs
// server-side (GitHub Actions), so pljusak.com's lack of CORS headers
// doesn't matter here — CORS is a browser-enforced restriction, not a
// server-to-server one. The page then fetches these files from
// raw.githubusercontent.com, which does send permissive CORS headers for
// public repos.
"use strict";

const fs = require("fs");

const STATIONS = [
  { key: "sudigo", file: "station-history-oroslavje.json" },
  { key: "dhmz_opatija", file: "station-history-opatija.json" },
];

function extract(html, varName) {
  const m = html.match(new RegExp("var " + varName + "\\s*=\\s*(\\[[\\s\\S]*?\\]);"));
  if (!m) throw new Error(`couldn't find ${varName} in page — pljusak.com's page format may have changed`);
  return JSON.parse(m[1]);
}

async function fetchStation(key) {
  const url = `https://pljusak.com/meteo.php?stanica=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();
  return {
    t: extract(html, "temperature_24h"),
    p: extract(html, "tlakovi_24h"),
    r: extract(html, "oborine_24h"),
    fetchedAt: new Date().toISOString(),
  };
}

async function main() {
  const failures = [];
  for (const station of STATIONS) {
    try {
      const data = await fetchStation(station.key);
      fs.writeFileSync(station.file, JSON.stringify(data));
      console.log(
        `Wrote ${station.file} (${data.t.length} temp points, ${data.p.length} pressure, ${data.r.length} precip)`
      );
    } catch (err) {
      console.error(`Failed for station "${station.key}":`, err.message);
      failures.push(station.key);
    }
  }
  if (failures.length) {
    throw new Error(`${failures.length}/${STATIONS.length} station(s) failed: ${failures.join(", ")}`);
  }
}

main().catch((err) => {
  console.error("Failed to update station history:", err.message);
  process.exit(1);
});
