const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '              {activeTab === "reader" && (',
  '              <React.Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>}>\n              {activeTab === "reader" && ('
);

fs.writeFileSync('src/App.tsx', code);
