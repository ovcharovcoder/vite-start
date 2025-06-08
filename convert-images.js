import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputDir = path.join(__dirname, 'src', 'images', 'src');
const outputDir = path.join(__dirname, 'src', 'images');

console.log('Starting image conversion...');
console.log('Input:', inputDir);
console.log('Output:', outputDir);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.readdirSync(inputDir).forEach(file => {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
    const fileName = path.basename(file, ext);
    const inputPath = path.join(inputDir, file);

    sharp(inputPath)
      .webp({ quality: 80 })
      .toFile(path.join(outputDir, `${fileName}.webp`))
      .then(() => console.log(`Converted ${file} to ${fileName}.webp`))
      .catch(err => console.error(`Error converting ${file} to webp:`, err));

    sharp(inputPath)
      .avif({ quality: 50 })
      .toFile(path.join(outputDir, `${fileName}.avif`))
      .then(() => console.log(`Converted ${file} to ${fileName}.avif`))
      .catch(err => console.error(`Error converting ${file} to avif:`, err));
  }
});
