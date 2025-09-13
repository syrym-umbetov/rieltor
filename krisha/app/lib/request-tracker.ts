// lib/request-tracker.ts
import fs from 'fs/promises';
import path from 'path';

interface RequestLog {
    timestamp: string;
    url: string;
    success: boolean;
    statusCode?: number;
    errorMessage?: string;
    responseTime?: number;
}

interface RequestStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    lastRequestTime?: string;
    requestsToday: number;
    requestsThisHour: number;
    averageResponseTime?: number;
}

class RequestTracker {
    private logFile: string;
    private statsFile: string;
    private rateLimitFile: string;

    constructor() {
        const logDir = path.join(process.cwd(), 'logs');
        this.logFile = path.join(logDir, 'requests.jsonl');
        this.statsFile = path.join(logDir, 'stats.json');
        this.rateLimitFile = path.join(logDir, 'rate-limits.json');

        this.ensureLogDirectory();
    }

    private async ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        try {
            await fs.access(logDir);
        } catch {
            await fs.mkdir(logDir, { recursive: true });
        }
    }

    // Логирование запроса
    async logRequest(log: RequestLog): Promise<void> {
        const logEntry = JSON.stringify(log) + '\n';

        try {
            await fs.appendFile(this.logFile, logEntry);
            await this.updateStats(log);
        } catch (error) {
            console.error('Ошибка при логировании:', error);
        }
    }

    // Обновление статистики
    private async updateStats(log: RequestLog): Promise<void> {
        let stats = await this.getStats();

        stats.totalRequests++;
        if (log.success) {
            stats.successfulRequests++;
        } else {
            stats.failedRequests++;
        }

        stats.lastRequestTime = log.timestamp;

        // Подсчет запросов за сегодня
        const today = new Date().toDateString();
        const logDate = new Date(log.timestamp).toDateString();
        if (today === logDate) {
            stats.requestsToday++;
        } else {
            stats.requestsToday = 1;
        }

        // Подсчет запросов за текущий час
        const currentHour = new Date().getHours();
        const logHour = new Date(log.timestamp).getHours();
        if (currentHour === logHour) {
            stats.requestsThisHour++;
        } else {
            stats.requestsThisHour = 1;
        }

        // Расчет среднего времени ответа
        if (log.responseTime) {
            if (stats.averageResponseTime) {
                stats.averageResponseTime =
                    (stats.averageResponseTime * (stats.totalRequests - 1) + log.responseTime) /
                    stats.totalRequests;
            } else {
                stats.averageResponseTime = log.responseTime;
            }
        }

        await fs.writeFile(this.statsFile, JSON.stringify(stats, null, 2));
    }

    // Получение текущей статистики
    async getStats(): Promise<RequestStats> {
        try {
            const data = await fs.readFile(this.statsFile, 'utf-8');
            return JSON.parse(data);
        } catch {
            return {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                requestsToday: 0,
                requestsThisHour: 0
            };
        }
    }

    // Проверка лимитов
    async checkRateLimits(): Promise<{
        canProceed: boolean;
        reason?: string;
        waitTime?: number;
    }> {
        const stats = await this.getStats();
        const limits = await this.getRateLimits();

        // Проверка дневного лимита
        if (limits.dailyLimit && stats.requestsToday >= limits.dailyLimit) {
            const nextDay = new Date();
            nextDay.setDate(nextDay.getDate() + 1);
            nextDay.setHours(0, 0, 0, 0);
            const waitTime = nextDay.getTime() - Date.now();

            return {
                canProceed: false,
                reason: `Достигнут дневной лимит (${limits.dailyLimit} запросов)`,
                waitTime
            };
        }

        // Проверка часового лимита
        if (limits.hourlyLimit && stats.requestsThisHour >= limits.hourlyLimit) {
            const nextHour = new Date();
            nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
            const waitTime = nextHour.getTime() - Date.now();

            return {
                canProceed: false,
                reason: `Достигнут часовой лимит (${limits.hourlyLimit} запросов)`,
                waitTime
            };
        }

        // Проверка минимальной задержки между запросами
        if (limits.minDelay && stats.lastRequestTime) {
            const lastRequestTime = new Date(stats.lastRequestTime).getTime();
            const timeSinceLastRequest = Date.now() - lastRequestTime;

            if (timeSinceLastRequest < limits.minDelay) {
                return {
                    canProceed: false,
                    reason: 'Слишком частые запросы',
                    waitTime: limits.minDelay - timeSinceLastRequest
                };
            }
        }

        return { canProceed: true };
    }

    // Получение настроек лимитов
    private async getRateLimits() {
        try {
            const data = await fs.readFile(this.rateLimitFile, 'utf-8');
            return JSON.parse(data);
        } catch {
            // Дефолтные безопасные лимиты
            return {
                dailyLimit: 10000,   // 10k запросов в день
                hourlyLimit: 500,    // 500 запросов в час
                minDelay: 1000      // минимум 1 секунда между запросами
            };
        }
    }

    // Установка лимитов
    async setRateLimits(limits: {
        dailyLimit?: number;
        hourlyLimit?: number;
        minDelay?: number;
    }): Promise<void> {
        const currentLimits = await this.getRateLimits();
        const newLimits = { ...currentLimits, ...limits };
        await fs.writeFile(this.rateLimitFile, JSON.stringify(newLimits, null, 2));
    }

    // Экспорт логов для анализа
    async exportLogs(startDate?: Date, endDate?: Date): Promise<RequestLog[]> {
        try {
            const content = await fs.readFile(this.logFile, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());

            let logs = lines.map(line => JSON.parse(line) as RequestLog);

            if (startDate) {
                logs = logs.filter(log => new Date(log.timestamp) >= startDate);
            }

            if (endDate) {
                logs = logs.filter(log => new Date(log.timestamp) <= endDate);
            }

            return logs;
        } catch {
            return [];
        }
    }

    // Очистка старых логов
    async cleanupOldLogs(daysToKeep: number = 30): Promise<void> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const logs = await this.exportLogs(cutoffDate);
        const newContent = logs.map(log => JSON.stringify(log)).join('\n') + '\n';

        await fs.writeFile(this.logFile, newContent);
    }
}

// Singleton экземпляр
export const requestTracker = new RequestTracker();

// Утилита для измерения времени выполнения
export function measureTime() {
    const start = Date.now();
    return () => Date.now() - start;
}

