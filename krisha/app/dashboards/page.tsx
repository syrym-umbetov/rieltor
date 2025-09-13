import {useEffect, useState} from "react";

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const response = await fetch('/api/stats');
            const data = await response.json();
            setStats(data);
            setLoading(false);
        };

        fetchStats();
        const interval = setInterval(fetchStats, 5000); // Обновление каждые 5 секунд

        return () => clearInterval(interval);
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-8">Мониторинг парсера Krisha.kz</h1>

            <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-2">Всего запросов</h2>
                    <p className="text-4xl font-bold">{stats.stats.totalRequests}</p>
                    <p className="text-sm text-gray-500 mt-2">
                        Успешных: {stats.stats.successfulRequests} |
                        Ошибок: {stats.stats.failedRequests}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-2">Сегодня</h2>
                    <p className="text-4xl font-bold">{stats.stats.requestsToday}</p>
                    <p className="text-sm text-gray-500 mt-2">
                        Лимит: {stats.limits.daily}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{width: `${(stats.stats.requestsToday / stats.limits.daily) * 100}%`}}
                        ></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-2">В этот час</h2>
                    <p className="text-4xl font-bold">{stats.stats.requestsThisHour}</p>
                    <p className="text-sm text-gray-500 mt-2">
                        Лимит: {stats.limits.hourly}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div
                            className="bg-green-600 h-2.5 rounded-full"
                            style={{width: `${(stats.stats.requestsThisHour / stats.limits.hourly) * 100}%`}}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="mt-8 bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Производительность</h2>
                <p>Среднее время ответа: {stats.stats.averageResponseTime?.toFixed(0) || 0} ms</p>
                <p>Последний запрос: {stats.stats.lastRequestTime || 'Нет данных'}</p>
            </div>
        </div>
    );
}
