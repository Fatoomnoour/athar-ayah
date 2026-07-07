const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  'import { initAnalytics, trackAppOpen } from "./lib/analytics";',
  'import { initAnalytics, trackAppOpen } from "./lib/analytics";\nimport { useFCM } from "./hooks/useFCM";'
);

code = code.replace(
  '  // Session Persistence',
  '  useFCM();\n\n  // Session Persistence'
);

fs.writeFileSync('src/App.tsx', code);
