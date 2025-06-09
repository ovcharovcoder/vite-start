import chokidar from 'chokidar';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imageDir = path.join(__dirname, 'src', 'images', 'src');
const fontDir = path.join(__dirname, 'src', 'fonts', 'src');

console.log('Watching for changes...');
console.log('Images:', imageDir);
console.log('Fonts:', fontDir);

// Watching the images
chokidar
  .watch(imageDir, { ignoreInitial: false, awaitWriteFinish: true })
  .on('all', (event, filePath) => {
    if (
      /\.(png|jpe?g)$/i.test(filePath) &&
      (event === 'add' || event === 'change')
    ) {
      console.log(
        `Detected ${event} on ${filePath}, running convert-images.js...`
      );
      exec('node convert-images.js', (err, stdout, stderr) => {
        if (err) {
          console.error('Error running convert-images.js:', err);
          return;
        }
        console.log(stdout);
        if (stderr) console.error(stderr);
      });
    }
  });

// Watching the fonts
chokidar
  .watch(fontDir, { ignoreInitial: false, awaitWriteFinish: true })
  .on('all', (event, filePath) => {
    if (/\.ttf$/i.test(filePath) && (event === 'add' || event === 'change')) {
      console.log(
        `Detected ${event} on ${filePath}, running convert-fonts.js...`
      );
      exec('node convert-fonts.js', (err, stdout, stderr) => {
        if (err) {
          console.error('Error running convert-fonts.js:', err);
          return;
        }
        console.log(stdout);
        if (stderr) console.error(stderr);
      });
    }
  });
