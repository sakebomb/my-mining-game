import { openDB, IDBPDatabase } from 'idb';
import { AUTO_SAVE_INTERVAL } from '../config/constants';

const DB_NAME = 'dig-deep-to-victory';
const DB_VERSION = 1;
const STORE_NAME = 'save';
const SAVE_KEY = 'main';

export interface SaveData {
  inventory: {
    items: Record<string, number>;
    equipped: Record<string, string>;
    enhancements: Record<string, number>;
    money: number;
  };
  player: {
    x: number;
    y: number;
    z: number;
  };
  worldSeed: number;
  timestamp: number;
}

/**
 * Persistent save/load system using IndexedDB.
 * Auto-saves every 30 seconds and on page blur.
 */
export class SaveSystem {
  private db: IDBPDatabase | null = null;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private blurHandler: (() => void) | null = null;

  /** Called to collect current game state for saving */
  onCollectSaveData: (() => SaveData) | null = null;

  /** Called when save data is loaded (on startup) */
  onLoadSaveData: ((data: SaveData) => void) | null = null;

  /** Called when save completes */
  onSaveComplete: ((success: boolean) => void) | null = null;

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });

    // Start auto-save timer
    this.autoSaveTimer = setInterval(() => {
      this.save();
    }, AUTO_SAVE_INTERVAL);

    // Save on page blur (tab switch, minimize)
    this.blurHandler = () => this.save();
    window.addEventListener('blur', this.blurHandler);
  }

  /** Save current game state to IndexedDB */
  async save(): Promise<boolean> {
    if (!this.db || !this.onCollectSaveData) return false;

    try {
      const data = this.onCollectSaveData();
      data.timestamp = Date.now();
      await this.db.put(STORE_NAME, data, SAVE_KEY);
      this.onSaveComplete?.(true);
      return true;
    } catch (err) {
      console.error('Save failed:', err);
      this.onSaveComplete?.(false);
      return false;
    }
  }

  /** Load saved game state from IndexedDB */
  async load(): Promise<SaveData | null> {
    if (!this.db) return null;

    try {
      const data = await this.db.get(STORE_NAME, SAVE_KEY) as SaveData | undefined;
      if (data) {
        this.onLoadSaveData?.(data);
        return data;
      }
      return null;
    } catch (err) {
      console.error('Load failed:', err);
      return null;
    }
  }

  /** Check if a save exists */
  async hasSave(): Promise<boolean> {
    if (!this.db) return false;
    try {
      const data = await this.db.get(STORE_NAME, SAVE_KEY);
      return data !== undefined;
    } catch {
      return false;
    }
  }

  /** Delete the save (reset) */
  async reset(): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.delete(STORE_NAME, SAVE_KEY);
    } catch (err) {
      console.error('Reset failed:', err);
    }
  }

  dispose(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    if (this.blurHandler) {
      window.removeEventListener('blur', this.blurHandler);
      this.blurHandler = null;
    }
    this.db?.close();
    this.db = null;
  }
}
