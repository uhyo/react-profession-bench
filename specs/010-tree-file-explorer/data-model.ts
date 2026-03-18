// --- Types ---

export type TreeNodeType = "file" | "directory";

export interface FileNode {
  type: "file";
  name: string;
  size: number; // bytes
  fileType: string; // e.g. "tsx", "json", "md"
  content: string;
}

export interface DirectoryNode {
  type: "directory";
  name: string;
  children: TreeNode[];
}

export type TreeNode = FileNode | DirectoryNode;

// --- Tree data ---

export const FILE_TREE: TreeNode[] = [
  {
    type: "directory",
    name: "src",
    children: [
      {
        type: "directory",
        name: "components",
        children: [
          {
            type: "file",
            name: "Header.tsx",
            size: 1240,
            fileType: "tsx",
            content: `import React from "react";\n\ninterface HeaderProps {\n  title: string;\n}\n\nexport function Header({ title }: HeaderProps) {\n  return (\n    <header>\n      <h1>{title}</h1>\n      <nav>\n        <a href="/">Home</a>\n        <a href="/about">About</a>\n      </nav>\n    </header>\n  );\n}`,
          },
          {
            type: "file",
            name: "Footer.tsx",
            size: 680,
            fileType: "tsx",
            content: `export function Footer() {\n  return (\n    <footer>\n      <p>&copy; 2026 My App</p>\n    </footer>\n  );\n}`,
          },
          {
            type: "file",
            name: "Button.tsx",
            size: 920,
            fileType: "tsx",
            content: `interface ButtonProps {\n  label: string;\n  onClick: () => void;\n  variant?: "primary" | "secondary";\n}\n\nexport function Button({ label, onClick, variant = "primary" }: ButtonProps) {\n  return (\n    <button className={\`btn btn-\${variant}\`} onClick={onClick}>\n      {label}\n    </button>\n  );\n}`,
          },
        ],
      },
      {
        type: "directory",
        name: "hooks",
        children: [
          {
            type: "file",
            name: "useLocalStorage.ts",
            size: 1560,
            fileType: "ts",
            content: `import { useState, useCallback } from "react";\n\nexport function useLocalStorage<T>(key: string, initialValue: T) {\n  const [value, setValue] = useState<T>(() => {\n    const stored = localStorage.getItem(key);\n    return stored ? JSON.parse(stored) : initialValue;\n  });\n\n  const set = useCallback((newValue: T) => {\n    setValue(newValue);\n    localStorage.setItem(key, JSON.stringify(newValue));\n  }, [key]);\n\n  return [value, set] as const;\n}`,
          },
          {
            type: "file",
            name: "useDebounce.ts",
            size: 480,
            fileType: "ts",
            content: `import { useState, useEffect } from "react";\n\nexport function useDebounce<T>(value: T, delay: number): T {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const timer = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(timer);\n  }, [value, delay]);\n  return debounced;\n}`,
          },
        ],
      },
      {
        type: "file",
        name: "App.tsx",
        size: 2100,
        fileType: "tsx",
        content: `import { Header } from "./components/Header";\nimport { Footer } from "./components/Footer";\n\nfunction App() {\n  return (\n    <div className="app">\n      <Header title="My Application" />\n      <main>\n        <h2>Welcome</h2>\n        <p>This is the main content area.</p>\n      </main>\n      <Footer />\n    </div>\n  );\n}\n\nexport default App;`,
      },
      {
        type: "file",
        name: "main.tsx",
        size: 320,
        fileType: "tsx",
        content: `import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\n\ncreateRoot(document.getElementById("root")!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>\n);`,
      },
      {
        type: "file",
        name: "types.ts",
        size: 450,
        fileType: "ts",
        content: `export interface User {\n  id: string;\n  name: string;\n  email: string;\n  role: "admin" | "editor" | "viewer";\n}\n\nexport interface Post {\n  id: string;\n  title: string;\n  body: string;\n  authorId: string;\n  createdAt: string;\n}`,
      },
    ],
  },
  {
    type: "directory",
    name: "public",
    children: [
      {
        type: "file",
        name: "index.html",
        size: 380,
        fileType: "html",
        content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>My App</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.tsx"></script>\n</body>\n</html>`,
      },
      {
        type: "file",
        name: "favicon.ico",
        size: 4286,
        fileType: "ico",
        content: "(binary file)",
      },
    ],
  },
  {
    type: "file",
    name: "package.json",
    size: 580,
    fileType: "json",
    content: `{\n  "name": "my-app",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "vite",\n    "build": "tsc && vite build"\n  },\n  "dependencies": {\n    "react": "^19.0.0",\n    "react-dom": "^19.0.0"\n  }\n}`,
  },
  {
    type: "file",
    name: "tsconfig.json",
    size: 420,
    fileType: "json",
    content: `{\n  "compilerOptions": {\n    "target": "ES2020",\n    "lib": ["ES2020", "DOM"],\n    "module": "ESNext",\n    "moduleResolution": "bundler",\n    "jsx": "react-jsx",\n    "strict": true\n  },\n  "include": ["src"]\n}`,
  },
  {
    type: "file",
    name: "README.md",
    size: 1200,
    fileType: "md",
    content: `# My App\n\nA sample React application.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Project Structure\n\n- \`src/\` — Source code\n- \`public/\` — Static assets\n- \`package.json\` — Dependencies`,
  },
];
