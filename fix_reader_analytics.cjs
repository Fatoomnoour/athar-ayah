const fs = require('fs');
let code = fs.readFileSync('src/components/QuranReader.tsx', 'utf8');

code = code.replace(
  'import { Play, Bookmark, MessageSquare, BookOpen, Search, ArrowRight, ArrowLeft, Settings, Hash, Check, Info } from "lucide-react";',
  'import { Play, Bookmark, MessageSquare, BookOpen, Search, ArrowRight, ArrowLeft, Settings, Hash, Check, Info } from "lucide-react";\nimport { trackSurahOpen, trackSearch } from "../lib/analytics";'
);

code = code.replace(
  '  useEffect(() => {\n    if (surahId) {',
  '  useEffect(() => {\n    if (surahId) {\n      trackSurahOpen(surahId, surahs.find(s => s.number === surahId)?.name || "");'
);

code = code.replace(
  '          onChange={(e) => setSearchQuery(e.target.value)}',
  '          onChange={(e) => {\n            setSearchQuery(e.target.value);\n            if(e.target.value.length > 2) trackSearch(e.target.value);\n          }}'
);

fs.writeFileSync('src/components/QuranReader.tsx', code);
