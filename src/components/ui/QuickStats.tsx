interface QuickStatsProps {
    stats: { label: string; count: number | string; icon?: string }[];
}

export default function QuickStats({ stats }: QuickStatsProps) {
    return (
        <div className="flex flex-wrap gap-3 mb-4">
            {stats.map((stat, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg text-sm">
                    <span className="text-gray-400">{stat.label}:</span>
                    <span className="text-white font-bold">{stat.count}</span>
                </div>
            ))}
        </div>
    );
}
