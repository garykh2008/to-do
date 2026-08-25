// 產生一個簡單的純色方形 PNG 當作小工具的預設圖示（tray icon / window icon）。
// 之後正式打包前，建議換成設計過的 icon.ico / icon.icns / icon.png。
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePng(size, [r, g, b]) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: truecolor (RGB)
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk("IHDR", ihdrData);

  const rowBytes = size * 3;
  const raw = Buffer.alloc((rowBytes + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const inset = 2;
      const isBorder = x < inset || y < inset || x >= size - inset || y >= size - inset;
      const px = rowStart + 1 + x * 3;
      if (isBorder) {
        raw[px] = 255;
        raw[px + 1] = 255;
        raw[px + 2] = 255;
      } else {
        raw[px] = r;
        raw[px + 1] = g;
        raw[px + 2] = b;
      }
    }
  }
  const idat = chunk("IDAT", zlib.deflateSync(raw));
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const outDir = path.join(__dirname, "..", "apps", "widget", "resources");
fs.mkdirSync(outDir, { recursive: true });

const blue = [37, 99, 235];
fs.writeFileSync(path.join(outDir, "icon.png"), makePng(256, blue));
fs.writeFileSync(path.join(outDir, "tray-icon.png"), makePng(32, blue));

console.log("Generated icon.png (256x256) and tray-icon.png (32x32) in apps/widget/resources/");
