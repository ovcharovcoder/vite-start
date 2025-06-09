import { defineConfig } from 'vite';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import postcssPresetEnv from 'postcss-preset-env';
import path from 'path';
import fs from 'fs';
import { glob } from 'glob';
import { copy } from 'vite-plugin-copy';

const pagesDir = path.join(__dirname, 'src', 'pages');
const componentsDir = path.join(__dirname, 'src', 'components');

// Find all HTML files in src/pages/
let pages = {};
try {
  const pageFiles = glob.sync(path.join(pagesDir, '*.html'), {
    windowsPathsNoEscape: true,
  });
  console.log('Found page files:', pageFiles);
  pages = pageFiles.reduce((acc, file) => {
    const name = path.basename(file, '.html');
    acc[name] = file;
    return acc;
  }, {});
  if (Object.keys(pages).length === 0) {
    console.warn('No HTML files found in src/pages/');
  }
} catch (err) {
  console.error('Error scanning src/pages:', err);
}

// Load components synchronously
let headerContent = '';
let footerContent = '';
try {
  headerContent = fs.readFileSync(
    path.join(componentsDir, 'header.html'),
    'utf-8'
  );
  footerContent = fs.readFileSync(
    path.join(componentsDir, 'footer.html'),
    'utf-8'
  );
  console.log('Components loaded successfully');
} catch (err) {
  console.error('Error loading components:', err);
}

export default defineConfig({
  base: '/',
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: '',
    emptyOutDir: true,
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/js/main.js'),
        ...pages,
      },
      output: {
        entryFileNames: 'js/[name].min.js',
        chunkFileNames: 'js/[name]-[hash].min.js',
        assetFileNames: ({ name }) => {
          if (/\.css$/i.test(name)) {
            return 'css/style.min.css';
          }
          if (/\.(woff|woff2)$/i.test(name)) {
            return 'fonts/[name][extname]';
          }
          if (/\.(webp|avif|jpg|png|jpeg)$/i.test(name)) {
            return 'images/[name][extname]';
          }
          if (/\.svg$/i.test(name)) {
            return 'images/icons/[name][extname]';
          }
          return '[name][extname]';
        },
        manualChunks: false,
      },
    },
    minify: 'esbuild',
    cssMinify: 'esbuild',
    assetsInclude: [
      '**/*.woff',
      '**/*.woff2',
      '**/*.svg',
      '**/*.webp',
      '**/*.avif',
    ],
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "./src/scss/vars.scss" as *;
          @use "./src/scss/fonts.scss" as *;
          @use "./src/scss/mixins.scss" as *;
        `,
      },
    },
    postcss: {
      plugins: [autoprefixer(), cssnano(), postcssPresetEnv()],
    },
  },
  plugins: [
    copy({
      targets: [
        { src: 'src/images/*.{webp,avif,jpg,png,jpeg}', dest: 'dist/images' },
        { src: 'src/images/icons/*.svg', dest: 'dist/images/icons' },
        { src: 'src/fonts/**/*.{woff,woff2}', dest: 'dist/fonts' },
      ],
      hook: 'writeBundle',
      verbose: true,
    }),
    {
      name: 'fix-paths',
      transform(code, id) {
        if (id.endsWith('.css') || id.endsWith('.scss')) {
          return code.replace(
            /url\(\/(fonts|images)\/([^)]+)\)/g,
            'url($1/$2)'
          );
        }
      },
    },
    {
      name: 'fix-html-paths',
      transformIndexHtml(html) {
        console.log('Fixing HTML paths...');
        let fixedHtml = html
          .replace(/\/src\/images\/(.*?)\.(jpg|png|webp|avif)/g, 'images/$1.$2')
          .replace(
            /\/src\/images\/src\/(.*?)\.(jpg|png|webp|avif)/g,
            'images/$1.$2'
          )
          .replace(/\/src\/images\/icons\/(.*?)\.svg/g, 'images/icons/$1.svg')
          .replace(/\/src\/scss\/.*\.scss/g, 'css/style.min.css')
          .replace(/\/src\/js\/.*\.js/g, 'js/main.min.js')
          .replace(/src\/images\/(.*?)\.(jpg|png|webp|avif)/g, 'images/$1.$2')
          .replace(/src\/images\/icons\/(.*?)\.svg/g, 'images/icons/$1.svg')
          .replace(/\/+images\/(.*?)\.(jpg|png|webp|avif)/g, 'images/$1.$2')
          .replace(/\/+images\/icons\/(.*?)\.svg/g, 'images/icons/$1.svg')
          .replace(/\/+css\/style\.min\.css/g, 'css/style.min.css')
          .replace(/\/+js\/main\.min\.js/g, 'js/main.min.js');
        console.log(
          'Fixed HTML paths:',
          fixedHtml.match(/(images|css|js)\/[^"]*/g) || 'No paths found'
        );
        return fixedHtml;
      },
    },
    {
      name: 'remove-cross',
      transformIndexHtml(html) {
        console.log('Removing crossorigin attributes...');
        const fixedHtml = html
          .replace(/\s+crossorigin(\s*=\s*('|")[^"']*\2)?/gi, '')
          .replace(/\s+crossorigin/gi, '');
        console.log('Crossorigin removed:', !fixedHtml.includes('crossorigin'));
        return fixedHtml;
      },
    },
    {
      name: 'inject-html',
      configureServer(server) {
        return () => {
          server.middlewares.use(async (req, res, next) => {
            console.log(`Processing request: ${req.url}`);
            try {
              let pageName = path.basename(req.url, '.html') || 'index';
              if (req.url === '/' || req.url === '/index.html') {
                pageName = 'index';
              }
              console.log(`Processing page: ${pageName}`);
              let pageContent = '<h1>Default Page</h1>';
              if (pages[pageName]) {
                pageContent = fs.readFileSync(pages[pageName], 'utf-8');
                console.log(
                  `Loaded content for ${pageName}: ${pageContent.substring(
                    0,
                    50
                  )}...`
                );
              } else {
                console.log(
                  `No page content found for ${req.url}, using default`
                );
                next();
                return;
              }
              if (!headerContent || !footerContent) {
                console.error('Error: Components not loaded');
                res.statusCode = 500;
                res.end('<h1>Error: Components not loaded</h1>');
                return;
              }
              const finalHtml = headerContent.replace(
                '<!-- CONTENT -->',
                pageContent + footerContent
              );
              console.log(`Generated HTML length: ${finalHtml.length}`);
              res.setHeader('Content-Type', 'text/html');
              res.statusCode = 200;
              res.end(finalHtml);
            } catch (err) {
              console.error(`Error processing ${req.url}: ${err.message}`);
              next();
            }
          });
        };
      },
      transformIndexHtml: {
        order: 'pre',
        handler(html, ctx) {
          console.log(`Transforming HTML path: ${ctx.path}`);
          try {
            let pageName = path.basename(ctx.path, '.html') || 'index';
            if (ctx.path === '/' || ctx.path === '/index.html') {
              pageName = 'index';
            }
            console.log(`Processing page: ${pageName}`);
            let pageContent = '<h1>Default Page</h1>';
            if (pages[pageName]) {
              pageContent = fs.readFileSync(pages[pageName], 'utf-8');
              console.log(
                `Loaded content for ${pageName}: ${pageContent.substring(
                  0,
                  50
                )}...`
              );
            } else {
              console.log(
                `No page content found for ${pageName}, using default`
              );
            }
            if (!headerContent || !footerContent) {
              console.error('Error: Components not loaded');
              return '<h1>Error: Components not loaded</h1>';
            }
            const finalHtml = headerContent.replace(
              '<!-- CONTENT -->',
              pageContent + footerContent
            );
            console.log(`Generated HTML length: ${finalHtml.length}`);
            return finalHtml;
          } catch (err) {
            console.error(`Error transforming ${ctx.path}: ${err.message}`);
            return '<h1>Error: Failed to inject content</h1>';
          }
        },
      },
    },
    {
      name: 'flatten-html',
      writeBundle(options, bundle) {
        const outputDir = options.dir || 'dist';
        Object.keys(bundle).forEach(fileName => {
          if (fileName.endsWith('.html') && fileName.includes('/')) {
            const newFileName = path.basename(fileName);
            const oldPath = path.join(outputDir, fileName);
            const newPath = path.join(outputDir, newFileName);
            if (fs.existsSync(oldPath)) {
              fs.renameSync(oldPath, newPath);
              console.log(`Moved ${fileName} to ${newFileName}`);
            }
          }
        });
        const srcDir = path.join(outputDir, 'src');
        if (fs.existsSync(srcDir)) {
          fs.rmSync(srcDir, { recursive: true, force: true });
          console.log('Removed src directory from dist');
        }
      },
    },
    {
      name: 'debug-requests',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          console.log(`HTTP request: ${req.method} ${req.url}`);
          next();
        });
      },
    },
  ],
  server: {
    port: 3000,
    open: true,
    host: 'localhost',
    fs: {
      allow: ['.'],
    },
  },
});
