// Tells Bing and other IndexNow search engines (they feed Copilot, ChatGPT search and DuckDuckGo) that these pages exist
// or changed. Run it AFTER a deploy:  node scripts/indexnow.mjs
// The key file is public/90d03d0d9066a7cbd1c0b0335be52fe7.txt (it must be live at https://apps.vyuhika.com/90d03d0d9066a7cbd1c0b0335be52fe7.txt).
const host = "apps.vyuhika.com";
const key = "90d03d0d9066a7cbd1c0b0335be52fe7";
const base = "https://" + host;

const sitemap = await (await fetch(base + "/sitemap.xml")).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => u.startsWith(base));
if (urlList.length === 0) throw new Error("No URLs found in the sitemap. Is the site deployed?");

const res = await fetch("https://api.indexnow.org/IndexNow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation: base + "/" + key + ".txt", urlList }),
});
console.log("Sent " + urlList.length + " URLs. IndexNow answered " + res.status + " (200 or 202 means accepted).");
