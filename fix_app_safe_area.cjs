const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 py-2.5 px-3 z-45 flex items-center justify-around shadow-lg">',
  '        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] px-3 z-45 flex items-center justify-around shadow-lg">'
);

fs.writeFileSync('src/App.tsx', code);
