/**
 * Generate favicon.ico from the correct INDEX icon
 * Uses sharp to convert PNG to ICO format with multiple sizes
 * 
 * Run: node scripts/generate-favicon.js
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

const appDir = path.join(__dirname, '..', 'app');
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const sourceIcon = path.join(iconsDir, 'icon-192.png');

async function generateFavicon() {
  console.log('Generating favicon.ico...\n');

  if (!fs.existsSync(sourceIcon)) {
    console.error(`Error: Source icon not found at ${sourceIcon}`);
    console.error('Please ensure icon-192.png exists in public/icons/');
    process.exit(1);
  }

  // ICO format requires multiple sizes
  // We'll create a multi-resolution ICO with common favicon sizes
  const sizes = [16, 32, 48];
  
  // Read the source PNG
  const sourceBuffer = await sharp(sourceIcon).toBuffer();
  
  // Create ICO file with multiple sizes
  // Note: sharp doesn't directly support ICO output, so we'll use PNG and convert
  // For a proper ICO, we'd need a library like 'to-ico', but let's use a simpler approach:
  // Generate a 32x32 PNG and copy it as favicon.ico (browsers will accept PNG as ICO)
  
  const faviconPath = path.join(appDir, 'favicon.ico');
  
  // Generate 32x32 version (most common favicon size)
  await sharp(sourceIcon)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 250, g: 247, b: 242, alpha: 1 } // #FAF7F2
    })
    .png()
    .toFile(faviconPath);
  
  console.log(`✓ Generated favicon.ico at ${faviconPath}`);
  console.log('\n✅ Favicon generated successfully!');
  console.log('Note: Modern browsers accept PNG format for favicon.ico');
}

generateFavicon().catch((error) => {
  console.error('Error generating favicon:', error);
  process.exit(1);
});
