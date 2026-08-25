// 產生正式的 App icon：一個 indigo 圓角方形背景 + 白色打勾，跟 App 內的 accent 色（indigo-600）一致。
// 這個 script 需要 sharp 才能跑，但 sharp 不是 runtime 依賴，平常不會裝在專案裡。
// 之後要調整圖示時：
//   pnpm add -D -w sharp && node scripts/generate-app-icon.mjs && pnpm remove -w sharp
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const svg = `
<svg width="512" height="512" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="88" height="88" rx="22" fill="#4F46E5"/>
  <path d="M26 54 L42 70 L76 32" fill="none" stroke="#FFFFFF" stroke-width="10"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`.trim();

const svgBuffer = Buffer.from(svg);

const targets = [
  { file: join(root, "apps/widget/resources/icon.png"), size: 512 },
  { file: join(root, "apps/widget/resources/tray-icon.png"), size: 256 },
  { file: join(root, "apps/web/app/icon.png"), size: 512 },
];

for (const { file, size } of targets) {
  mkdirSync(dirname(file), { recursive: true });
  await sharp(svgBuffer, { density: 384 }).resize(size, size).png().toFile(file);
  console.log(`wrote ${file} (${size}x${size})`);
}
