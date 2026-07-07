const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  'import { useFCM } from "./hooks/useFCM";',
  'import { useFCM } from "./hooks/useFCM";\nimport OfflineIndicator from "./components/OfflineIndicator";'
);

code = code.replace(
  '      <Header ',
  '      <OfflineIndicator />\n      <Header '
);

fs.writeFileSync('src/App.tsx', code);
