const fs = require('fs');
let code = fs.readFileSync('src/components/QuranReader.tsx', 'utf8');

code = code.replace(
  'import { Play, Bookmark, MessageSquare, BookOpen, Search, ArrowRight, ArrowLeft, Settings, Hash, Check, Info } from "lucide-react";\\nimport { trackSurahOpen, trackSearch } from "../lib/analytics";',
  'import { Play, Bookmark, MessageSquare, BookOpen, Search, ArrowRight, ArrowLeft, Settings, Hash, Check, Info } from "lucide-react";\nimport { trackSurahOpen, trackSearch } from "../lib/analytics";\nimport { updateAdvancedStats } from "../services/firestoreService";'
);

// We need to inject the tracker interval inside QuranReader
code = code.replace(
  '  // Navigation State',
  `  // Premium Tracking State
  const [sessionVersesRead, setSessionVersesRead] = useState<number>(0);
  const [sessionReadTimeMinutes, setSessionReadTimeMinutes] = useState<number>(0);
  const lastSyncTime = useRef<number>(Date.now());
  const activeVersesTracker = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const minutesPassed = Math.floor((now - lastSyncTime.current) / 60000);
      if (minutesPassed >= 1 || activeVersesTracker.current.size > 0) {
        updateAdvancedStats(currentUser.id, activeVersesTracker.current.size, minutesPassed, selectedSurah.toString());
        
        setSessionReadTimeMinutes(prev => prev + minutesPassed);
        setSessionVersesRead(prev => prev + activeVersesTracker.current.size);
        
        lastSyncTime.current = now;
        activeVersesTracker.current.clear();
      }
    }, 60000); // sync every minute
    
    return () => {
      clearInterval(interval);
      // Sync on unmount
      const now = Date.now();
      const minutesPassed = Math.floor((now - lastSyncTime.current) / 60000);
      if (minutesPassed > 0 || activeVersesTracker.current.size > 0) {
        updateAdvancedStats(currentUser.id, activeVersesTracker.current.size, minutesPassed, selectedSurah.toString());
      }
    };
  }, [currentUser, selectedSurah]);
  
  // Navigation State`
);

// We need to mark verses as read when they come into view. We can just simulate it: when scrolling/changing verses, add it.
// Let's add it in the useEffect that updates lastRead
code = code.replace(
  '        saveReadingProgress(currentUser.id, {',
  '        activeVersesTracker.current.add(verseObj.numberInSurah);\n        saveReadingProgress(currentUser.id, {'
);

fs.writeFileSync('src/components/QuranReader.tsx', code);
