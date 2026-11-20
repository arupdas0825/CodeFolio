const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const publicDir = path.join(__dirname, "public");
const logo = path.join(publicDir, "codefolio-logo.jpeg");
const background = "#0d0d10";

const sizes = {
  "favicon-16x16.png": 16,
  "favicon-32x32.png": 32,
  "favicon-48x48.png": 48,
  "favicon-64x64.png": 64,
  "favicon-128x128.png": 128,
  "favicon.png": 32,
  "android-chrome-192x192.png": 192,
  "android-chrome-512x512.png": 512,
  "icon-192x192.png": 192,
  "icon-512x512.png": 512,
  "mstile-150x150.png": 150,
};

function png(size) {
  return sharp(logo).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

function iconFile(frames) {
  const directory = Buffer.alloc(6 + frames.length * 16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(frames.length, 4);
  let dataOffset = directory.length;

  for (const [index, { size, contents }] of frames.entries()) {
    const offset = 6 + index * 16;
    directory[offset] = size;
    directory[offset + 1] = size;
    directory.writeUInt16LE(1, offset + 4);
    directory.writeUInt16LE(32, offset + 6);
    directory.writeUInt32LE(contents.length, offset + 8);
    directory.writeUInt32LE(dataOffset, offset + 12);
    dataOffset += contents.length;
  }

  return Buffer.concat([directory, ...frames.map(({ contents }) => contents)]);
}

function write(filename, bytes) {
  return fs.writeFile(path.join(publicDir, filename), bytes);
}

function canvas(width, height, background) {
  return sharp({ create: { width, height, channels: 3, background } });
}

async function generateIcons() {
  const images = new Map(await Promise.all(
    [...new Set(Object.values(sizes))].map(async (size) => [size, await png(size)])
  ));
  await Promise.all(Object.entries(sizes).map(([filename, size]) => write(filename, images.get(size))));

  // ICO readers require RGBA PNG frames, even when the source JPEG is opaque.
  const frames = await Promise.all([16, 32, 48, 64].map(async (size) => ({
    size,
    contents: await sharp(images.get(size)).ensureAlpha().png().toBuffer(),
  })));
  const ico = iconFile(frames);
  // Next serves the app favicon by convention, and existing clients may use the public path.
  await Promise.all([
    write("favicon.ico", ico),
    fs.writeFile(path.join(__dirname, "src", "app", "favicon.ico"), ico),
    sharp(logo).resize(180, 180).png().toFile(path.join(publicDir, "apple-touch-icon.png")),
    canvas(512, 512, background).composite([{ input: await png(340), gravity: "center" }]).png().toFile(path.join(publicDir, "maskable-icon-512x512.png")),
    canvas(1200, 630, background).composite([{ input: await png(300), gravity: "center" }]).png().toFile(path.join(publicDir, "og-image.png")),
    write("codefolio-logo.png", await png(512)),
    write("favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><image width="128" height="128" href="data:image/png;base64,${images.get(128).toString("base64")}"/></svg>\n`),
  ]);
}

generateIcons().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
