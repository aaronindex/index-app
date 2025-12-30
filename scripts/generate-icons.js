/**
 * Simple icon generator for PWA icons
 * Generates placeholder icons with "I" or "INDEX" text
 * 
 * Run: node scripts/generate-icons.js
 * 
 * Note: This creates basic SVG icons. For production, replace with proper design assets.
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');

// Ensure directories exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Color scheme matching theme
const lightBg = '#FAF7F2'; // warm paper
const darkText = '#121211'; // warm ink

function generateSVGIcon(size, text = 'I', isMaskable = false) {
  // For maskable icons, add safe zone (80% of size)
  const safeZone = isMaskable ? size * 0.1 : 0;
  const contentSize = size - safeZone * 2;
  const fontSize = size * 0.5;
  const x = size / 2;
  const y = size / 2 + fontSize * 0.35; // Center vertically

  return `<?xml version="1.0" encoding="UTF-8"?>
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
  >${text}</text>
</svg>`;
}

// Generate icons
const icons = [
  { size: 192, filename: 'icon-192.png', text: 'I' },
  { size: 512, filename: 'icon-512.png', text: 'I' },
  { size: 192, filename: 'icon-192-maskable.png', text: 'I', maskable: true },
  { size: 512, filename: 'icon-512-maskable.png', text: 'I', maskable: true },
  { size: 180, filename: '../apple-touch-icon.png', text: 'I' }, // iOS
];

console.log('Generating placeholder icons...');

icons.forEach(({ size, filename, text, maskable }) => {
  const svg = generateSVGIcon(size, text, maskable);
  const filePath = path.join(iconsDir, filename);
  
  // For now, save as SVG (browsers can use SVG, but PNG is preferred)
  // In production, convert these to PNG using a tool like sharp, imagemagick, or online converter
  const svgPath = filePath.replace('.png', '.svg');
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ Generated ${svgPath}`);
  
  // Note: To convert SVG to PNG, you can:
  // 1. Use sharp: npm install sharp, then convert programmatically
  // 2. Use online tool: https://cloudconvert.com/svg-to-png
  // 3. Use ImageMagick: convert icon.svg icon.png
  // 4. Use browser DevTools: Load SVG, right-click, "Capture node screenshot"
});

console.log('\n⚠️  Icons generated as SVG. For PWA, convert to PNG:');
console.log('   Option 1: Use sharp library (npm install sharp)');
console.log('   Option 2: Use online converter (cloudconvert.com)');
console.log('   Option 3: Use browser DevTools to capture as PNG');
console.log('\nFor now, creating basic PNG placeholders using a simple approach...');

// Create a simple HTML file that can be used to generate PNGs
const htmlGenerator = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 20px; background: #f0f0f0; }
    .icon { display: inline-block; margin: 10px; }
  </style>
</head>
<body>
  <h1>INDEX Icon Generator</h1>
  <p>Right-click each icon → "Save image as..." → Save as PNG</p>
  ${icons.map(({ size, filename }) => {
    const svgPath = `/icons/${filename.replace('.png', '.svg')}`;
    return `<div class="icon">
      <p>${filename} (${size}x${size})</p>
      <img src="${svgPath}" width="${size}" height="${size}" />
    </div>`;
  }).join('\n  ')}
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'icon-generator.html'), htmlGenerator);
console.log('✓ Created icon-generator.html in public/ - open in browser to export PNGs');


