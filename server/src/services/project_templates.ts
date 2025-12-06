/**
 * Project templates for initializing new apps
 */

export interface ProjectTemplate {
  name: string;
  files: Record<string, string>;
}

// Basic Vite + React template
export const viteReactTemplate: ProjectTemplate = {
  name: "vite-react",
  files: {
    "package.json": JSON.stringify(
      {
        name: "my-app",
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview",
        },
        dependencies: {
          react: "^18.3.1",
          "react-dom": "^18.3.1",
        },
        devDependencies: {
          "@vitejs/plugin-react": "^4.3.4",
          vite: "^6.0.0",
        },
      },
      null,
      2
    ),
    "vite.config.js": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
  },
})
`,
    "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
    "src/main.jsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`,
    "src/App.jsx": `import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <h1>Welcome to Your App</h1>
      <p>Start editing src/App.jsx to customize this page</p>
      <button 
        onClick={() => setCount(c => c + 1)}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          borderRadius: '8px',
          border: 'none',
          background: 'white',
          color: '#667eea',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Count: {count}
      </button>
    </div>
  )
}

export default App
`,
    "src/index.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`,
  },
};

// Simple HTML template (no build step)
export const simpleHtmlTemplate: ProjectTemplate = {
  name: "simple-html",
  files: {
    "package.json": JSON.stringify(
      {
        name: "my-app",
        private: true,
        version: "0.0.0",
        scripts: {
          dev: "npx serve -l ${PORT:-3000}",
        },
        devDependencies: {
          serve: "^14.2.0",
        },
      },
      null,
      2
    ),
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>Welcome to Your App</h1>
    <p>Edit index.html to customize this page</p>
  </div>
  <script src="script.js"></script>
</body>
</html>
`,
    "styles.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.container {
  text-align: center;
  padding: 2rem;
}

h1 {
  margin-bottom: 1rem;
}
`,
    "script.js": `// Your JavaScript code here
console.log('App loaded!');
`,
  },
};

export const templates: Record<string, ProjectTemplate> = {
  "vite-react": viteReactTemplate,
  "simple-html": simpleHtmlTemplate,
};

export function getTemplate(templateName: string): ProjectTemplate {
  return templates[templateName] || viteReactTemplate;
}

