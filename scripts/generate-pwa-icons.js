/**
 * Generate PWA icons from SVG to PNG
 * Uses sharp (already installed via Next.js)
 * 
 * Run: node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.error('Error: sharp is not available. Please install it: npm install sharp');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');

// Color scheme matching theme
const lightBg = '#FAF7F2'; // warm paper
const darkText = '#121211'; // warm ink

async function generatePNGIcon(size, filename, isMaskable = false) {
  const safeZone = isMaskable ? size * 0.1 : 0;
  const contentSize = size - safeZone * 2;
  const fontSize = size * 0.5;
  const x = size / 2;
  const y = size / 2 + fontSize * 0.35;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${lightBg}"/>
  <text 
    x="${x}" 
    y="${y}" 
    font-family="system-ui, -apple-system, sans-serif" 
    font-size="${fontSize}" 
    font-weight="600" 
    fill="${darkText}" 
    text-anchor="middle" 
    dominant-baseline="middle"
  >I</text>
</svg>`;

  const outputPath = path.join(iconsDir, filename);
  const buffer = Buffer.from(svg);
  
  await sharp(buffer)
    .resize(size, size)
    .png()
    .toFile(outputPath);
  
  console.log(`✓ Generated ${filename} (${size}x${size})`);
}

async function generateAppleTouchIcon() {
  const size = 180;
  const fontSize = size * 0.5;
  const x = size / 2;
  const y = size / 2 + fontSize * 0.35;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${lightBg}"/>
  <text 
    x="${x}" 
    y="${y}" 
    font-family="system-ui, -apple-system, sans-serif" 
    font-size="${fontSize}" 
    font-weight="600" 
    fill="${darkText}" 
    text-anchor="middle" 
    dominant-baseline="middle"
  >I</text>
</svg>`;

  const outputPath = path.join(publicDir, 'apple-touch-icon.png');
  const buffer = Buffer.from(svg);
  
  await sharp(buffer)
    .resize(size, size)
    .png()
    .toFile(outputPath);
  
  console.log(`✓ Generated apple-touch-icon.png (${size}x${size})`);
}

async function main() {
  console.log('Generating PWA icons...\n');

  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Generate all required icons
  await generatePNGIcon(192, 'icon-192.png', false);
  await generatePNGIcon(512, 'icon-512.png', false);
  await generatePNGIcon(192, 'icon-192-maskable.png', true);
  await generatePNGIcon(512, 'icon-512-maskable.png', true);
  await generateAppleTouchIcon();

  console.log('\n✅ All PWA icons generated successfully!');
}

main().catch((error) => {
  console.error('Error generating icons:', error);
  process.exit(1);
});

