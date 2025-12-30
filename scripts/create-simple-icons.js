/**
 * Create simple PWA icon placeholders
 * Creates minimal valid PNG files using base64 data
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Minimal valid PNG (1x1 transparent) - we'll create proper ones via browser
// For now, create a simple script that outputs instructions
console.log('Creating icon generation instructions...\n');

const instructions = `
To generate PWA icons:

1. Open public/icon-generator.html in your browser
2. Right-click each icon and "Save image as..." → Save as PNG
3. Place files in public/icons/:
   - icon-192.png (192x192)
   - icon-512.png (512x512)
   - icon-192-maskable.png (192x192)
   - icon-512-maskable.png (512x512)
4. Place apple-touch-icon.png (180x180) in public/

Alternatively, use an online tool like:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

For now, creating minimal placeholder files...
`;

console.log(instructions);

// Create a simple HTML file that can be used to generate icons
const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>INDEX Icon Generator</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    .icon-container {
      display: inline-block;
      margin: 20px;
      text-align: center;
    }
    .icon {
      background: #FAF7F2;
      border: 2px solid #ddd;
      display: inline-block;
    }
    canvas {
      display: block;
    }
    h1 { color: #333; }
    p { color: #666; }
  </style>
</head>
<body>
  <h1>INDEX PWA Icon Generator</h1>
  <p>Right-click each icon below → "Save image as..." → Save as PNG with the filename shown</p>
  
  <div class="icon-container">
    <h3>icon-192.png</h3>
    <canvas id="icon192" width="192" height="192" class="icon"></canvas>
  </div>
  
  <div class="icon-container">
    <h3>icon-512.png</h3>
    <canvas id="icon512" width="512" height="512" class="icon"></canvas>
  </div>
  
  <div class="icon-container">
    <h3>icon-192-maskable.png</h3>
    <canvas id="icon192m" width="192" height="192" class="icon"></canvas>
  </div>
  
  <div class="icon-container">
    <h3>icon-512-maskable.png</h3>
    <canvas id="icon512m" width="512" height="512" class="icon"></canvas>
  </div>
  
  <div class="icon-container">
    <h3>apple-touch-icon.png</h3>
    <canvas id="apple" width="180" height="180" class="icon"></canvas>
  </div>

  <script>
    function drawIcon(canvas, size, isMaskable = false) {
      const ctx = canvas.getContext('2d');
      const bg = '#FAF7F2';
      const text = '#121211';
      
      // Background
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);
      
      // Safe zone for maskable (80% of size)
      const safeZone = isMaskable ? size * 0.1 : 0;
      const contentSize = size - safeZone * 2;
      
      // Draw "I" text
      ctx.fillStyle = text;
      ctx.font = \`bold \${size * 0.5}px system-ui\`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('I', size / 2, size / 2);
    }
    
    drawIcon(document.getElementById('icon192'), 192, false);
    drawIcon(document.getElementById('icon512'), 512, false);
    drawIcon(document.getElementById('icon192m'), 192, true);
    drawIcon(document.getElementById('icon512m'), 512, true);
    drawIcon(document.getElementById('apple'), 180, false);
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'icon-generator.html'), htmlContent);
console.log('✓ Created public/icon-generator.html');
console.log('\n⚠️  Please open icon-generator.html in a browser and save the icons as PNG files.');

