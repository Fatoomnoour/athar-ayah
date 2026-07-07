const fs = require('fs');
let code = fs.readFileSync('src/components/AuthPage.tsx', 'utf8');

code = code.replace(
  'import { useState } from "react";',
  'import { useState } from "react";\nimport { trackLogin } from "../lib/analytics";'
);

code = code.replace(
  '          onLoginSuccess(userCredential.user);',
  '          trackLogin(isLogin ? "email_password" : "email_signup");\n          onLoginSuccess(userCredential.user);'
);

code = code.replace(
  '          onLoginSuccess(result.user);',
  '          trackLogin("google_popup");\n          onLoginSuccess(result.user);'
);

fs.writeFileSync('src/components/AuthPage.tsx', code);
