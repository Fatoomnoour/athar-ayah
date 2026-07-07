const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(/<meta name="theme-color" content="[^"]+" \/>/g, '');

fs.writeFileSync('index.html', code);
