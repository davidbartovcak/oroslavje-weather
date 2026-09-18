#!/usr/bin/env node
// Fetches the Zabok–Sudigo 24h station history from pljusak.com and writes
// it to station-history.json. This runs server-side (GitHub Actions), so
// pljusak.com's lack of CORS headers doesn't matter here — CORS is a
// browser-enforced restriction, not a server-to-server one. The page then
// fetches this file from raw.githubusercontent.com, which does send
// permissive CORS headers for public repos.
"use strict";

const fs = require("fs");

const URL = "https://pljusak.com/meteo.php?stanica=sudigo";

function extract(html, varName) {
  const m = html.match(new RegExp("var " + varName + "\\s*=\\s*(\\[[\\s\\S]*?\\]);"));
  if (!m) throw new Error(`couldn't find ${varName} in page — pljusak.com's page format may have changed`);
  return JSON.parse(m[1]);
}

async function main() {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${URL}`);
  const html = await res.text();

  const data = {
    t: extract(html, "temperature_24h"),
    p: extract(html, "tlakovi_24h"),
    r: extract(html, "oborine_24h"),
    fetchedAt: new Date().toISOString(),
  };

  fs.writeFileSync("station-history.json", JSON.stringify(data));
  console.log(
    `Wrote station-history.json (${data.t.length} temp points, ${data.p.length} pressure, ${data.r.length} precip)`
  );
}

main().catch((err) => {
  console.error("Failed to update station history:", err.message);
  process.exit(1);
});
