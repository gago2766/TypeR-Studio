// src/utils/fontStorage.ts

export interface StoredFont {
  name: string;
  data: ArrayBuffer;
}

const DB_NAME = 'TypeRStudioFontsDB';
const STORE_NAME = 'fonts';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
  });
}

export async function saveFont(name: string, data: ArrayBuffer): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ name, data });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getFonts(): Promise<StoredFont[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (error) {
    console.error('Error loading fonts from IndexedDB:', error);
    return [];
  }
}

export function saveFavoriteFonts(favs: string[]): void {
  try {
    localStorage.setItem('typer_studio_fav_fonts', JSON.stringify(favs));
  } catch (e) {
    console.error('Error saving favorite fonts:', e);
  }
}

export function getFavoriteFonts(): string[] {
  try {
    const favs = localStorage.getItem('typer_studio_fav_fonts');
    return favs ? JSON.parse(favs) : [];
  } catch (e) {
    console.error('Error getting favorite fonts:', e);
    return [];
  }
}
