// app/lib/request-tracker.ts
import { promises as fs } from 'fs';
import path from 'path';

interface RequestLog {
  timestamp: string;
  url: string;
  success: boolean;
  statusCode: number;
  responseTime?: number;
  errorMessage?: string;
}

interface RequestStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsToday: number;
  averageResponseTime?: number;
}

interface RateLimitCheck {
  canProceed: boolean;
  reason?: string;
  waitTime?: number;
}

class RequestTracker {
  private logFile: string;
  private logsDir: string;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logsDir, 'requests.json');
    this.ensureLogDir();
  }

  private async ensureLogDir() {
    try {
      await fs.access(this.logsDir);
    } catch {
      await fs.mkdir(this.logsDir, { recursive: true });
    }
  }

  async logRequest(request: RequestLog): Promise<void> {
    try {
      let logs: RequestLog[] = [];

      try {
        const logData = await fs.readFile(this.logFile, 'utf-8');
        logs = JSON.parse(logData);
      } catch {
        // Файл не существует или пустой
      }

      logs.push(request);

      // Оставляем только последние 1000 запросов
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }

      await fs.writeFile(this.logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Ошибка записи лога:', error);
    }
  }

  async getStats(): Promise<RequestStats> {
    try {
      const logData = await fs.readFile(this.logFile, 'utf-8');
      const logs: RequestLog[] = JSON.parse(logData);

      const today = new Date().toDateString();
      const todayLogs = logs.filter(log => new Date(log.timestamp).toDateString() === today);

      const successfulRequests = logs.filter(log => log.success).length;
      const responseTimes = logs.filter(log => log.responseTime && log.success).map(log => log.responseTime!);
      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : undefined;

      return {
        totalRequests: logs.length,
        successfulRequests,
        failedRequests: logs.length - successfulRequests,
        requestsToday: todayLogs.length,
        averageResponseTime
      };
    } catch {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        requestsToday: 0
      };
    }
  }

  async checkRateLimits(): Promise<RateLimitCheck> {
    try {
      const stats = await this.getStats();
      const now = Date.now();

      // Лимиты для OLX (более мягкие чем для Krisha)
      const maxRequestsPerDay = 200;
      const maxRequestsPerHour = 50;
      const minDelayBetweenRequests = 10000; // 10 секунд

      if (stats.requestsToday >= maxRequestsPerDay) {
        return {
          canProceed: false,
          reason: 'Превышен дневной лимит запросов (200)',
          waitTime: 24 * 60 * 60 * 1000 // 24 часа
        };
      }

      // Проверяем последний час
      const logData = await fs.readFile(this.logFile, 'utf-8');
      const logs: RequestLog[] = JSON.parse(logData);
      const oneHourAgo = now - (60 * 60 * 1000);
      const lastHourRequests = logs.filter(log =>
        new Date(log.timestamp).getTime() > oneHourAgo
      );

      if (lastHourRequests.length >= maxRequestsPerHour) {
        return {
          canProceed: false,
          reason: 'Превышен часовой лимит запросов (50)',
          waitTime: 60 * 60 * 1000 // 1 час
        };
      }

      // Проверяем минимальную задержку между запросами
      if (logs.length > 0) {
        const lastRequest = logs[logs.length - 1];
        const timeSinceLastRequest = now - new Date(lastRequest.timestamp).getTime();

        if (timeSinceLastRequest < minDelayBetweenRequests) {
          return {
            canProceed: false,
            reason: 'Слишком частые запросы',
            waitTime: minDelayBetweenRequests - timeSinceLastRequest
          };
        }
      }

      return { canProceed: true };
    } catch {
      return { canProceed: true };
    }
  }
}

export const requestTracker = new RequestTracker();

export function measureTime(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}