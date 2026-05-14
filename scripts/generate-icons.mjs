import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const sizes = [180, 192, 512];
const outputDir = new URL('../public/icons/', import.meta.url);

mkdirSync(outputDir, { recursive: true });

for (const size of sizes) {
  writeFileSync(join(outputDir.pathname, `icon-${size}.png`), createIcon(size));
}

function createIcon(size) {
  const data = Buffer.alloc((size * 4 + 1) * size);

  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    data[rowStart] = 0;

    for (let x = 0; x < size; x += 1) {
      const offset = rowStart + 1 + x * 4;
      const nx = x / (size - 1);
      const ny = y / (size - 1);
      let color = gradient(nx, ny);

      if (roundedRect(nx, ny, 0.27, 0.39, 0.46, 0.38, 0.075)) {
        color = [255, 255, 255, 255];
      }

      if (handleStroke(nx, ny)) {
        color = [255, 255, 255, 255];
      }

      if (roundedRect(nx, ny, 0.46, 0.53, 0.08, 0.08, 0.018)) {
        color = [34, 197, 94, 255];
      }

      if (roundedRect(nx, ny, 0.425, 0.565, 0.15, 0.025, 0.012)) {
        color = [34, 197, 94, 255];
      }

      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = color[3];
    }
  }

  return Buffer.concat([
    pngSignature(),
    pngChunk('IHDR', ihdr(size, size)),
    pngChunk('IDAT', deflateSync(data)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function gradient(nx, ny) {
  const t = Math.min(1, Math.max(0, nx * 0.45 + ny * 0.55));
  const start = [8, 145, 178];
  const end = [22, 163, 74];

  return [
    Math.round(start[0] + (end[0] - start[0]) * t),
    Math.round(start[1] + (end[1] - start[1]) * t),
    Math.round(start[2] + (end[2] - start[2]) * t),
    255,
  ];
}

function roundedRect(nx, ny, x, y, width, height, radius) {
  const px = Math.max(x - nx, 0, nx - (x + width));
  const py = Math.max(y - ny, 0, ny - (y + height));
  const insideBounds = nx >= x && nx <= x + width && ny >= y && ny <= y + height;

  if (!insideBounds) {
    return false;
  }

  const cx = nx < x + radius ? x + radius : nx > x + width - radius ? x + width - radius : nx;
  const cy = ny < y + radius ? y + radius : ny > y + height - radius ? y + height - radius : ny;
  const dx = nx - cx;
  const dy = ny - cy;

  return px === 0 && py === 0 && dx * dx + dy * dy <= radius * radius;
}

function handleStroke(nx, ny) {
  if (ny < 0.24 || ny > 0.48 || nx < 0.35 || nx > 0.65) {
    return false;
  }

  const dx = (nx - 0.5) / 0.16;
  const dy = (ny - 0.48) / 0.2;
  const distance = dx * dx + dy * dy;

  return distance > 0.82 && distance < 1.12 && ny < 0.47;
}

function pngSignature() {
  return Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
}

function ihdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
