const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourceImage = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\7912dd49-29d6-415c-b618-b0966d8b9e02\\.user_uploaded\\media__1786034407632.png';
const publicDir = path.join(__dirname, 'public');

const sizes = {
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'favicon-48x48.png': 48,
  'apple-touch-icon.png': 180,
  'android-chrome-192x192.png': 192,
  'android-chrome-512x512.png': 512,
  'mstile-150x150.png': 150,
  'codefolio-logo.png': 800
};

async function generateIcons() {
  console.log('Generating icons...');
  const image = sharp(sourceImage);
  
  for (const [filename, size] of Object.entries(sizes)) {
    const outPath = path.join(publicDir, filename);
    await image
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(outPath);
    console.log(`Generated ${filename}`);
  }

  await image
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFormat('png')
    .toFile(path.join(publicDir, 'favicon.ico'))
    .catch(() => {
        fs.copyFileSync(path.join(publicDir, 'favicon-32x32.png'), path.join(publicDir, 'favicon.ico'));
    });
  
  await image
    .resize(512, 512, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .toFile(path.join(publicDir, 'maskable-icon-512x512.png'));
    
  console.log('Done!');
}

generateIcons().catch(console.error);
