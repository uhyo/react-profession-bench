// --- Types ---

export type DocumentType = "plain-text" | "markdown" | "json";

export interface Document {
  id: string;
  type: DocumentType;
  title: string;
  content: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  "plain-text": "Plain Text",
  "markdown": "Markdown",
  "json": "JSON",
};

export const SAMPLE_CONTENT: Record<DocumentType, { title: string; content: string }> = {
  "plain-text": {
    title: "Notes",
    content: "Welcome to the multi-tab editor!\n\nYou can create multiple documents of different types.\nEach editor loads on demand when first opened.\n\nTry creating a Markdown or JSON document from the New Document button.",
  },
  "markdown": {
    title: "README",
    content: "# Project Title\n\nA brief description of the project.\n\n## Getting Started\n\nThese instructions will help you set up the project.\n\n### Prerequisites\n\n- Node.js **18+**\n- npm or *pnpm*\n\n### Installation\n\n```\nnpm install\nnpm run dev\n```\n\n## Features\n\n- Feature one\n- Feature two\n- Feature three\n\n## License\n\nMIT",
  },
  "json": {
    title: "config",
    content: '{\n  "name": "my-app",\n  "version": "1.0.0",\n  "settings": {\n    "theme": "dark",\n    "language": "en",\n    "notifications": true\n  },\n  "features": [\n    "editor",\n    "preview",\n    "export"\n  ]\n}',
  },
};

// --- ID generator ---

let nextId = 0;
export function generateDocumentId(): string {
  return `doc-${nextId++}`;
}
