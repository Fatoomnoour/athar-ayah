const fs = require('fs');
let code = fs.readFileSync('src/components/QuranReader.tsx', 'utf8');

code = code.replace(/text-slate-900 dark:text-white/g, 'text-inherit');

fs.writeFileSync('src/components/QuranReader.tsx', code);
