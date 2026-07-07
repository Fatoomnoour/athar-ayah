const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  'import { Theme, useDarkMode } from "./hooks/useDarkMode";',
  'import { Theme, useDarkMode } from "./hooks/useDarkMode";\nimport { initAnalytics, trackAppOpen } from "./lib/analytics";\nimport { getMessaging, getToken } from "firebase/messaging";\nimport { messaging } from "./lib/firebase";'
);

code = code.replace(
  'useEffect(() => {\n    const unsubscribe = subscribeToAuthChanges(',
  'useEffect(() => {\n    initAnalytics().then(() => trackAppOpen());\n    const unsubscribe = subscribeToAuthChanges('
);

fs.writeFileSync('src/App.tsx', code);
