const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace standard imports with lazy imports
code = code.replace(/import NotesTab from "\.\/components\/NotesTab";/g, 'const NotesTab = React.lazy(() => import("./components/NotesTab"));');
code = code.replace(/import ProgressTab from "\.\/components\/ProgressTab";/g, 'const ProgressTab = React.lazy(() => import("./components/ProgressTab"));');
code = code.replace(/import BookmarksTab from "\.\/components\/BookmarksTab";/g, 'const BookmarksTab = React.lazy(() => import("./components/BookmarksTab"));');
code = code.replace(/import MemorizationTab from "\.\/components\/MemorizationTab";/g, 'const MemorizationTab = React.lazy(() => import("./components/MemorizationTab"));');
code = code.replace(/import GroupsTab from "\.\/components\/groups\/GroupsTab";/g, 'const GroupsTab = React.lazy(() => import("./components/groups/GroupsTab"));');
code = code.replace(/import ProgressPage from "\.\/components\/ProgressPage";/g, 'const ProgressPage = React.lazy(() => import("./components/ProgressPage"));');
code = code.replace(/import SettingsPage from "\.\/components\/SettingsPage";/g, 'const SettingsPage = React.lazy(() => import("./components/SettingsPage"));');

// Add Suspense wrapping around the tab contents
code = code.replace(
  '{activeTab === "reader" && (',
  '<React.Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>}>\n              {activeTab === "reader" && ('
);

// Close Suspense after the last tab which is activeTab === "settings"
// Need to find where the tabs end.
