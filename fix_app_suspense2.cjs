const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '              {activeTab === "settings" && (\n                <SettingsPage \n                  currentUser={currentUser} \n                  onUpdateUser={(u) => setCurrentUser(u)}\n                  onShowToast={handleShowToast}\n                  onRefreshStats={fetchStats}\n                />\n              )}',
  '              {activeTab === "settings" && (\n                <SettingsPage \n                  currentUser={currentUser} \n                  onUpdateUser={(u) => setCurrentUser(u)}\n                  onShowToast={handleShowToast}\n                  onRefreshStats={fetchStats}\n                />\n              )}\n            </React.Suspense>'
);

fs.writeFileSync('src/App.tsx', code);
