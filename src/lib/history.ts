import { UploadResultData, UploadCategory } from './types';

export interface UploadHistoryItem {
  id: string;
  name: string;
  storedName: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: string;
  category: UploadCategory;
}

export const STORAGE_HISTORY_KEY = 'mojahidx_upload_history';
export const MAX_HISTORY_ITEMS = 100;

/**
 * Retrieves the stored upload history from localStorage.
 */
export function getUploadHistory(): UploadHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to load upload history:', err);
    return [];
  }
}

/**
 * Saves the given history items to localStorage.
 */
export function saveUploadHistory(items: UploadHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_HISTORY_KEY,
      JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS))
    );
  } catch (err) {
    console.error('Failed to save upload history:', err);
  }
}

/**
 * Adds an upload result to the top of the history list.
 */
export function addUploadToHistory(data: UploadResultData): UploadHistoryItem[] {
  if (typeof window === 'undefined') return [];
  const current = getUploadHistory();
  const url = data.customDomainUrl || data.proxyUrl || data.directUrl;
  const isImage =
    data.mimeType.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif)$/i.test(data.storedName);
  const category: UploadCategory = data.category || (isImage ? 'image' : 'file');

  const newItem: UploadHistoryItem = {
    id: data.sha || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: data.name,
    storedName: data.storedName,
    size: data.size,
    mimeType: data.mimeType,
    url,
    uploadedAt: data.uploadedAt || new Date().toISOString(),
    category,
  };

  // Remove existing entry with identical storedName or url to prevent duplicates
  const filtered = current.filter(
    (item) => item.storedName !== newItem.storedName && item.url !== newItem.url
  );

  const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
  saveUploadHistory(updated);
  return updated;
}

/**
 * Removes a specific item from the upload history by its id.
 */
export function removeUploadFromHistory(id: string): UploadHistoryItem[] {
  if (typeof window === 'undefined') return [];
  const current = getUploadHistory();
  const updated = current.filter((item) => item.id !== id);
  saveUploadHistory(updated);
  return updated;
}

/**
 * Clears all items from upload history.
 */
export function clearUploadHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_HISTORY_KEY);
  } catch (err) {
    console.error('Failed to clear upload history:', err);
  }
}
