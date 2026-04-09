# Scripture Study

A desktop app for LDS scripture study. Import scripture text files, search by keyword or meaning, tag verses with topics, take notes, and organize study lists.

Built with Electron + React + TypeScript + SQLite.

## Features

- **Import & Read** — Import scripture text files (KJV Bible, Book of Mormon, D&C, Pearl of Great Price). Read chapters with tabbed navigation.
- **Full-Text Search** — FTS5-powered exact search with highlighted results and canon filters.
- **Semantic Search** — Find verses by meaning using local AI embeddings (sentence-transformers).
- **Topics & Tagging** — 50+ seeded topics with colors. Tag verses manually or use AI suggestions. Topic Explorer with stats grid and verse drill-down.
- **AI Integration** — Local Python sidecar running sentence-transformers. Batch tag review with keyboard shortcuts (Enter/Del/arrows).
- **Personal Notes** — Create, edit, and delete notes on any verse.
- **Study Lists** — Collect and order verses into named study lists.
- **Light/Dark Theme** — Parchment-inspired palette with full dark mode support.

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

### AI Features (Optional)

Semantic search and AI topic suggestions require a Python environment:

```bash
cd python
pip install -r requirements.txt
```

The app spawns the Python sidecar automatically when needed. Start it from **Topics > AI Settings**.

## Tech Stack

- **Electron** + **electron-vite** — Desktop shell and build tooling
- **React** + **TypeScript** — UI layer
- **Tailwind CSS** — Styling with CSS variable theming
- **Zustand** — State management
- **better-sqlite3** — Local database with FTS5 full-text search
- **FastAPI** + **sentence-transformers** — Local AI sidecar for embeddings
