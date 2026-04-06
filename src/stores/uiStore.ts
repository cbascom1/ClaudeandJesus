import { create } from 'zustand';

export type Theme = 'light' | 'dark';

export type MainView = 'library' | 'topics';

interface UiState {
  theme: Theme;
  mainView: MainView;
  sidebarCollapsed: boolean;
  contextPanelCollapsed: boolean;
  importDialogOpen: boolean;

  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setMainView: (view: MainView) => void;
  toggleSidebar: () => void;
  toggleContextPanel: () => void;
  setImportDialogOpen: (open: boolean) => void;
}

/** Initial theme read from localStorage (persisted) or defaulted to 'light'. */
function readInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* localStorage unavailable */
  }
  return 'light';
}

function applyThemeToDom(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

const initialTheme = readInitialTheme();
applyThemeToDom(initialTheme);

export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme,
  mainView: 'library' as MainView,
  sidebarCollapsed: false,
  contextPanelCollapsed: false,
  importDialogOpen: false,

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    applyThemeToDom(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* ignore */
    }
    set({ theme: next });
  },

  setTheme: (theme) => {
    applyThemeToDom(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },

  setMainView: (view) => set({ mainView: view }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleContextPanel: () => set((s) => ({ contextPanelCollapsed: !s.contextPanelCollapsed })),
  setImportDialogOpen: (open) => set({ importDialogOpen: open })
}));
