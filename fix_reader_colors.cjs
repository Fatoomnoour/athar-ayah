const fs = require('fs');
let code = fs.readFileSync('src/components/QuranReader.tsx', 'utf8');

// Bismillah
code = code.replace(/text-slate-900 dark:text-slate-100 tracking-wide font-black py-4 block select-none drop-shadow-sm leading-relaxed max-w-xl mx-auto/g, 
'tracking-wide font-black py-4 block select-none drop-shadow-sm leading-relaxed max-w-xl mx-auto text-inherit');

// Mushaf mode ayah
code = code.replace(/"hover:bg-emerald-500\/10 text-slate-900 dark:text-slate-100"/g, 
'"hover:bg-emerald-500/10"');

// Verse mode ayah
code = code.replace(/className="font-quran text-right select-all font-semibold leading-relaxed text-slate-900 dark:text-slate-100 mb-1"/g, 
'className="font-quran text-right select-all font-semibold leading-relaxed mb-1"');

// Memorize mode ayah
code = code.replace(/\? "text-slate-900 dark:text-slate-100 font-bold" /g, 
'? "font-bold" ');

fs.writeFileSync('src/components/QuranReader.tsx', code);
