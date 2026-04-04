export interface ActivityEntry {
    action: string;     // "created", "updated", "deleted"
    resource: string;   // "poster", "festival", etc.
    name: string;       // item name/title
    timestamp: string;  // ISO string
}

const STORAGE_KEY = 'admin_activity_log';
const MAX_ENTRIES = 50;

export function logActivity(action: string, resource: string, name: string) {
    const entries = getActivityLog();
    entries.unshift({
        action,
        resource,
        name,
        timestamp: new Date().toISOString(),
    });
    // Keep only last 50
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function getActivityLog(): ActivityEntry[] {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

export function clearActivityLog() {
    localStorage.removeItem(STORAGE_KEY);
}

export function formatTimeAgo(timestamp: string): string {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
