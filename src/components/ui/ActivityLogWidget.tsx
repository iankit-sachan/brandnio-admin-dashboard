import { useState, useEffect } from 'react';
import { getActivityLog, formatTimeAgo, ActivityEntry } from '../../utils/activityLog';
import { Clock } from 'lucide-react';

export default function ActivityLogWidget() {
    const [entries, setEntries] = useState<ActivityEntry[]>([]);

    useEffect(() => {
        setEntries(getActivityLog());
        const interval = setInterval(() => setEntries(getActivityLog()), 10000);
        return () => clearInterval(interval);
    }, []);

    if (entries.length === 0) return null;

    const actionColors: Record<string, string> = {
        created: 'text-green-400',
        updated: 'text-blue-400',
        deleted: 'text-red-400',
    };

    return (
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-5">
            <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-brand-text-muted" />
                <h3 className="text-sm font-medium text-brand-text-muted">Recent Activity</h3>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {entries.slice(0, 10).map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={actionColors[entry.action] || 'text-brand-text-muted'}>
                            {entry.action}
                        </span>
                        <span className="text-brand-text-muted">{entry.resource}</span>
                        <span className="text-brand-text font-medium truncate max-w-[120px]">"{entry.name}"</span>
                        <span className="text-brand-text-muted ml-auto whitespace-nowrap">{formatTimeAgo(entry.timestamp)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
