export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] Error reading key "${key}":`, e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[SafeStorage] Error setting key "${key}":`, e);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] Error removing key "${key}":`, e);
    }
  }
};
