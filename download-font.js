const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const fontUrl = 'https://int10h.org/oldschool-pc-fonts/download/ultimate_oldschool_pc_font_pack_v3.0_FULL.zip';
const assetsDir = path.join(__dirname, 'assets');
const zipPath = path.join(assetsDir, 'fonts.zip');
const fontPath = path.join(assetsDir, 'Perfect DOS VGA 437.ttf');

// Create assets directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
}

console.log('Please download the font manually:');
console.log('1. Visit: https://int10h.org/oldschool-pc-fonts/fontlist/');
console.log('2. Download "Perfect DOS VGA 437"');
console.log('3. Extract the .ttf file');
console.log(`4. Copy it to: ${fontPath}`);
console.log('5. Double-click the font file to install it system-wide');
