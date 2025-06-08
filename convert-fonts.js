import Fontmin from 'fontmin';
import ttf2woff2 from 'ttf2woff2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src', 'fonts', 'src');
const destDir = path.join(__dirname, 'src', 'fonts');

console.log('Starting font conversion...');
console.log('Source:', path.join(srcDir, '*.ttf'));
console.log('Destination:', destDir);

const fontmin = new Fontmin()
  .src(path.join(srcDir, '*.ttf'))
  .dest(destDir)
  .use(Fontmin.ttf2woff());

fontmin.run((err, files) => {
  if (err) {
    console.error('Fontmin error:', err);
    return;
  }

  const converted = [];
  files.forEach(file => {
    const filePath = file.path;
    const fileName = path.basename(filePath, path.extname(filePath));
    converted.push(filePath);

    if (path.extname(filePath) === '.ttf') {
      const woff2Path = path.join(destDir, `${fileName}.woff2`);
      const ttfBuffer = fs.readFileSync(filePath);
      const woff2Buffer = ttf2woff2(ttfBuffer);
      fs.writeFileSync(woff2Path, woff2Buffer);
      converted.push(woff2Path);
      fs.unlinkSync(filePath);
    }
  });

  console.log('Fonts converted:', converted);
});
