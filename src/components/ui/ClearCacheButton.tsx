import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function ClearCacheButton() {
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleClear = async () => {
        setLoading(true);
        try {
            // Call a custom admin endpoint to clear cache
            const token = localStorage.getItem('admin_token');
            await fetch('/api/admin/clear-cache/', {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
            });
            setDone(true);
            setTimeout(() => setDone(false), 3000);
        } catch (e) {
            console.error('Cache clear failed:', e);
        }
        setLoading(false);
    };

    return (
        <button onClick={handleClear} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {done ? 'Cache Cleared!' : loading ? 'Clearing...' : 'Publish to App'}
        </button>
    );
}
