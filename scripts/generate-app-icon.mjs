// 產生正式的 App icon：一個 indigo 背景 + 白色打勾，跟 App 內的 accent 色（indigo-600）一致。
// 桌面用（工作列/tray/favicon）用預先切好圓角的版本；
// PWA/apple-touch-icon 用滿版無圓角的版本，讓 iOS/Android 自己套用系統的遮罩形狀。
// 這個 script 需要 sharp 才能跑，但 sharp 不是 runtime 依賴，平常不會裝在專案裡。
// 之後要調整圖示時：
//   pnpm add -D -w sharp && node scripts/generate-app-icon.mjs && pnpm remove -w sharp
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const roundedSvg = `
<svg width="512" height="512" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="88" height="88" rx="22" fill="#4F46E5"/>
  <path d="M26 54 L42 70 L76 32" fill="none" stroke="#FFFFFF" stroke-width="10"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`.trim();

// 滿版、無圓角、打勾縮在安全區內 —— 給 PWA maskable icon / apple-touch-icon 用，
// 讓作業系統自己套圓角或圓形遮罩時不會把打勾切到。
const fullBleedSvg = `
<svg width="512" height="512" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="100" height="100" fill="#4F46E5"/>
  <path d="M32 53 L44 65 L70 36" fill="none" stroke="#FFFFFF" stroke-width="8"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`.trim();

const targets = [
  { svg: roundedSvg, file: join(root, "apps/widget/resources/icon.png"), size: 512 },
  { svg: roundedSvg, file: join(root, "apps/widget/resources/tray-icon.png"), size: 256 },
  { svg: roundedSvg, file: join(root, "apps/web/app/icon.png"), size: 512 },
  { svg: fullBleedSvg, file: join(root, "apps/web/app/apple-icon.png"), size: 180 },
  { svg: fullBleedSvg, file: join(root, "apps/web/public/icon-192.png"), size: 192 },
  { svg: fullBleedSvg, file: join(root, "apps/web/public/icon-512.png"), size: 512 },
];

for (const { svg, file, size } of targets) {
  mkdirSync(dirname(file), { recursive: true });
  await sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toFile(file);
  console.log(`wrote ${file} (${size}x${size})`);
}
