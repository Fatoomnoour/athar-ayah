const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '{!isReaderFocus && (\n        <OfflineIndicator />\n      <Header ',
  '{!isReaderFocus && (\n        <>\n          <OfflineIndicator />\n          <Header '
);

code = code.replace(
  '          onLogout={handleLogout}\n        />\n      )}',
  '          onLogout={handleLogout}\n          />\n        </>\n      )}'
);

fs.writeFileSync('src/App.tsx', code);
