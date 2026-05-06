// Generates icon-192.png and icon-512.png in public/
// App theme color: #c8a882 (caramel) with a paw print
const zlib = require("zlib");
const fs   = require("fs");
const path = require("path");

function crc32(buf) {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
    t[i] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = t[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const tb  = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const payload = Buffer.concat([tb, data]);
  const crcBuf  = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(payload));
  return Buffer.concat([len, payload, crcBuf]);
}

function makePNG(size) {
  // Background: #c8a882 (warm caramel)
  const bg  = [200, 168, 130];
  // Circle paw pad: #8b5e3c (darker brown) — drawn as a large centered circle
  const pad = [139, 94,  60];

  const raw = Buffer.alloc(size * (1 + size * 3));
  const cx = size / 2, cy = size / 2;
  const r  = size * 0.32; // main pad radius

  // Small toe pads
  const toes = [
    { x: cx - size * 0.20, y: cy - size * 0.28, r: size * 0.10 },
    { x: cx,               y: cy - size * 0.33, r: size * 0.10 },
    { x: cx + size * 0.20, y: cy - size * 0.28, r: size * 0.10 },
    { x: cx - size * 0.30, y: cy - size * 0.12, r: size * 0.09 },
  ];

  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      let color = bg;

      // Main pad
      if (dx * dx + dy * dy <= r * r) color = pad;
      // Toe pads
      for (const t of toes) {
        const tx = x - t.x, ty = y - t.y;
        if (tx * tx + ty * ty <= t.r * t.r) color = pad;
      }

      const offset = y * (1 + size * 3) + 1 + x * 3;
      raw[offset] = color[0]; raw[offset + 1] = color[1]; raw[offset + 2] = color[2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const sig = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "public");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "icon-192.png"), makePNG(192));
fs.writeFileSync(path.join(outDir, "icon-512.png"), makePNG(512));
console.log("✓ icon-192.png and icon-512.png written to public/");
