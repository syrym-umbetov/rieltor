// lib/scaling-utils.ts
// 4. Система очередей для пакетной обработки
import { Queue } from 'bull'; // npm install bull

// 1. Ротация User-Agent
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    // Добавьте больше
];

export function getRandomUserAgent() {
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// 2. Добавление случайных задержек
export function randomDelay(min: number = 1000, max: number = 5000) {
    return new Promise(resolve =>
        setTimeout(resolve, Math.random() * (max - min) + min)
    );
}

// 3. Proxy rotation (если используете)
interface ProxyConfig {
    host: string;
    port: number;
    auth?: {
        username: string;
        password: string;
    };
}

class ProxyRotator {
    private proxies: ProxyConfig[] = [];
    private currentIndex = 0;

    constructor(proxies: ProxyConfig[]) {
        this.proxies = proxies;
    }

    getNext(): ProxyConfig | null {
        if (this.proxies.length === 0) return null;
        const proxy = this.proxies[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        return proxy;
    }
}



export const parsingQueue = new Queue('krisha-parsing', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    }
});

// Обработчик очереди
parsingQueue.process(async (job) => {
    const { url } = job.data;

    // Добавляем случайную задержку
    await randomDelay(2000, 5000);

    // Парсим URL
    const response = await fetch('/api/parse-krisha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
    });

    return response.json();
});

// 5. Мониторинг блокировок
export class BlockDetector {
    private blockedResponses = new Map<string, number>();

    checkResponse(html: string, statusCode: number): boolean {
        const blockIndicators = [
            'Access Denied',
            'Доступ запрещен',
            'Too Many Requests',
            'captcha',
            'cf-browser-verification',
            'Слишком много запросов'
        ];

        if (statusCode === 403 || statusCode === 429) {
            return true;
        }

        return blockIndicators.some(indicator =>
            html.toLowerCase().includes(indicator.toLowerCase())
        );
    }

    recordBlock(ip: string) {
        const count = this.blockedResponses.get(ip) || 0;
        this.blockedResponses.set(ip, count + 1);

        if (count > 3) {
            console.error(`⚠️ IP ${ip} заблокирован более 3 раз!`);
            // Переключиться на другой proxy или остановить парсинг
        }
    }
}

// 6. Batch URL processor
export class BatchProcessor {
    private urls: string[] = [];
    private results: Map<string, any> = new Map();

    constructor(urls: string[]) {
        this.urls = urls;
    }

    async process(concurrency: number = 2) {
        const results = [];

        for (let i = 0; i < this.urls.length; i += concurrency) {
            const batch = this.urls.slice(i, i + concurrency);

            console.log(`Обработка batch ${i / concurrency + 1}/${Math.ceil(this.urls.length / concurrency)}`);

            const promises = batch.map(async (url) => {
                try {
                    // Добавляем случайную задержку для каждого запроса
                    await randomDelay(1000, 3000);

                    const response = await fetch('/api/parse-krisha', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'User-Agent': getRandomUserAgent()
                        },
                        body: JSON.stringify({ url })
                    });

                    return { url, data: await response.json() };
                } catch (error) {
                    return { url, error: error.message };
                }
            });

            const batchResults = await Promise.all(promises);
            results.push(...batchResults);

            // Пауза между батчами
            await randomDelay(5000, 10000);
        }

        return results;
    }
}

// 7. Умная стратегия повторных попыток
export class RetryStrategy {
    private maxRetries = 3;
    private baseDelay = 1000;

    async execute<T>(
        fn: () => Promise<T>,
        retries: number = this.maxRetries
    ): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            if (retries === 0) throw error;

            const delay = this.baseDelay * Math.pow(2, this.maxRetries - retries);
            console.log(`Повторная попытка через ${delay}ms...`);

            await new Promise(resolve => setTimeout(resolve, delay));
            return this.execute(fn, retries - 1);
        }
    }
}

// 8. Пример использования всего вместе
export async function safeBatchParse(urls: string[]) {
    const blockDetector = new BlockDetector();
    const retryStrategy = new RetryStrategy();
    const results = [];

    for (const url of urls) {
        try {
            const result = await retryStrategy.execute(async () => {
                // Случайная задержка
                await randomDelay(3000, 8000);

                // Запрос с ротацией User-Agent
                const response = await fetch('/api/parse-krisha', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': getRandomUserAgent()
                    },
                    body: JSON.stringify({ url })
                });

                const html = await response.text();

                // Проверяем на блокировку
                if (blockDetector.checkResponse(html, response.status)) {
                    throw new Error('Обнаружена блокировка');
                }

                return JSON.parse(html);
            });

            results.push({ url, success: true, data: result });

        } catch (error) {
            console.error(`Ошибка для ${url}:`, error);
            results.push({ url, success: false, error: error.message });

            // Если обнаружена блокировка, останавливаемся
            if (error.message.includes('блокировка')) {
                console.log('⛔ Остановка парсинга из-за блокировки');
                break;
            }
        }
    }

    return results;
}

// 9. Конфигурация для разных режимов
export const parsingModes = {
    safe: {
        concurrency: 1,
        delayMin: 5000,
        delayMax: 10000,
        dailyLimit: 100
    },
    moderate: {
        concurrency: 2,
        delayMin: 3000,
        delayMax: 7000,
        dailyLimit: 500
    },
    aggressive: {
        concurrency: 5,
        delayMin: 1000,
        delayMax: 3000,
        dailyLimit: 2000
    }
};