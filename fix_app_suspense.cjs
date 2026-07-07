const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '              {activeTab === "settings" && (\n                <SettingsPage \n                  currentUser={currentUser} \n                  onShowToast={handleShowToast} \n                />\n              )}',
  '              {activeTab === "settings" && (\n                <SettingsPage \n                  currentUser={currentUser} \n                  onShowToast={handleShowToast} \n                />\n              )}\n            </React.Suspense>'
);

fs.writeFileSync('src/App.tsx', code);
