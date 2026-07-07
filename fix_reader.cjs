const fs = require('fs');
let code = fs.readFileSync('src/components/QuranReader.tsx', 'utf8');

const trackingBlock = `  // Premium Tracking State
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
`;

code = code.replace(trackingBlock, '');
code = code.replace(
  '  // Navigation State',
  '  // Navigation State\n'
);
code = code.replace(
  '  const [selectionType, setSelectionType] = useState<"surah" | "page">("surah");',
  '  const [selectionType, setSelectionType] = useState<"surah" | "page">("surah");\n\n' + trackingBlock
);

fs.writeFileSync('src/components/QuranReader.tsx', code);
