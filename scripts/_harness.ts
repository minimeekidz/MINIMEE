// Throwaway: renders one interior's real markup into dist/_harness so a
// browser can be pointed at it without going through auth.
import fs from "node:fs";
import { INTERIORS } from "../src/lib/interiors";

const id = process.argv[2] ?? "cinema-lobby";
const interior = INTERIORS[id];
if (!interior) throw new Error(`no interior ${id}`);

const css = fs.readdirSync("dist/assets").find(f => f.endsWith(".css"))!;
const demo: Record<string, string> = {
  marquee: `<span class="marquee-text">軌道交通・金錢與商店・綠色公園</span>`,
  screen: `<span class="screen-title">軌道交通</span><span class="screen-idle">撳一下開場</span>`,
  board: `<span class="board-words">月台<em>yuet toi</em></span><span class="board-words">車票<em>che piu</em></span>`,
  tray: `<span class="tray-gems"><i class="gem lit"></i><i class="gem lit"></i><i class="gem"></i><i class="gem"></i></span>`,
};
const posters = ["theme-01", "theme-09", "theme-08"];
const names = ["軌道交通", "金錢與商店", "綠色公園"];
let p = -1;

const frames = (interior.frames ?? []).map(f => {
  let inner = demo[f.kind] ?? "";
  if (f.kind === "poster") {
    p += 1;
    inner = `<button class="wall-poster"><img src="/assets/posters/${posters[p % 3]}.webp">`
      + `<span class="wall-poster-name">${names[p % 3]}</span>`
      + `<span class="wall-poster-mark">${p}/4</span></button>`;
  }
  return `<div class="interior-frame frame-${f.kind}" style="left:${f.x * 100}%;top:${f.y * 100}%;width:${f.w * 100}%;height:${f.h * 100}%">${inner}</div>`;
}).join("");

const spots = interior.spots.map(s =>
  `<button class="interior-spot ${s.kind}" style="left:${s.x * 100}%;top:${s.y * 100}%">`
  + `<span class="spot-pin"></span><span class="spot-label"><strong>${s.label}</strong>`
  + `${s.hint ? `<small>${s.hint}</small>` : ""}</span></button>`).join("");

fs.mkdirSync("dist/_harness", { recursive: true });
fs.writeFileSync(`dist/_harness/${id}.html`, `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/assets/${css}"><style>body{margin:0}</style></head><body>
<main class="interior-scene"><div class="interior-art">
<img src="${interior.art}" alt="">${frames}${spots}
</div><header class="interior-bar"><button class="round-button">← 出去</button><h1>${interior.name}</h1></header>
</main></body></html>`);
console.log(`dist/_harness/${id}.html`);
