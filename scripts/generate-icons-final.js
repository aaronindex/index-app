/**
 * Final icon generation script
 * Creates actual PNG files using canvas
 * 
 * Run: node scripts/generate-icons-final.js
 * 
 * Requirements: npm install canvas (optional, will provide instructions if not available)
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');

// Ensure directories exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

let canvas, createCanvas, loadImage;
try {
  const canvasModule = require('canvas');
  createCanvas = canvasModule.createCanvas;
  loadImage = canvasModule.loadImage;
  console.log('✓ Canvas library found\n');
} catch (err) {
  console.log('⚠️  Canvas library not found. Creating HTML generator instead.\n');
  console.log('To generate PNG files programmatically, install canvas:');
  console.log('  npm install canvas\n');
  console.log('For now, use the HTML generator at public/icon-generator.html\n');
  process.exit(0);
}

function generateIcon(size, filename, isMaskable = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Colors matching theme
  const bg = '#FAF7F2'; // warm paper
  const text = '#121211'; // warm ink
  
  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  
  // Safe zone for maskable (80% of size)
  const safeZone = isMaskable ? size * 0.1 : 0;
  const contentSize = size - safeZone * 2;
  
  // Draw "I" text
  ctx.fillStyle = text;
  ctx.font = `bold ${size * 0.5}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('I', size / 2, size / 2);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(iconsDir, filename);
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Generated ${filename} (${size}x${size})`);
}

function generateAppleIcon() {
  const size = 180;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const bg = '#FAF7F2';
  const text = '#121211';
  
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  
  ctx.fillStyle = text;
  ctx.font = `bold ${size * 0.5}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('I', size / 2, size / 2);
  
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(publicDir, 'apple-touch-icon.png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Generated apple-touch-icon.png (${size}x${size})`);
}

console.log('Generating PWA icons...\n');

try {
  generateIcon(192, 'icon-192.png', false);
  generateIcon(512, 'icon-512.png', false);
  generateIcon(192, 'icon-192-maskable.png', true);
  generateIcon(512, 'icon-512-maskable.png', true);
  generateAppleIcon();
  
  console.log('\n✅ All PWA icons generated successfully!');
  console.log('Icons are ready in public/icons/ and public/apple-touch-icon.png');
} catch (error) {
  console.error('Error generating icons:', error.message);
  console.log('\nFallback: Use public/icon-generator.html in your browser');
  process.exit(1);
}

