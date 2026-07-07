const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

if (!code.includes('manifest.webmanifest')) {
  code = code.replace('</title>', '</title>\n    <link rel="manifest" href="/manifest.webmanifest" />\n    <meta name="theme-color" content="#0F766E" />\n    <link rel="apple-touch-icon" href="/icons/icon-192x192.jpg" />\n    <meta name="apple-mobile-web-app-capable" content="yes">\n    <meta name="apple-mobile-web-app-status-bar-style" content="default">\n    <meta name="apple-mobile-web-app-title" content="أثر آية">');
}

fs.writeFileSync('index.html', code);
