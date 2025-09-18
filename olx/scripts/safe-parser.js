// scripts/safe-parser.js
// Запускать через: node scripts/safe-parser.js

const fs = require('fs').promises;
const path = require('path');

// Конфигурация безопасного парсинга для OLX
const CONFIG = {
    maxRequests: 150,        // Максимум запросов (меньше чем для Krisha)
    delayMin: 20000,         // Минимум 20 секунд между запросами
    delayMax: 45000,         // Максимум 45 секунд
    batchSize: 10,           // Сохранять результаты каждые 10 запросов
    stopOnError: true,       // Остановиться при ошибке
    saveDir: './parsed-data' // Папка для сохранения
};

// Простой логгер
class Logger {
    constructor() {
        this.logFile = path.join(process.cwd(), 'logs', `parsing-${Date.now()}.log`);
        this.ensureLogDir();
    }

    async ensureLogDir() {
        const dir = path.dirname(this.logFile);
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    async log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${type}] ${message}\n`;

        console.log(logEntry.trim());
        await fs.appendFile(this.logFile, logEntry);
    }
}

// Парсер для OLX
class SafeOlxParser {
    constructor() {
        this.logger = new Logger();
        this.results = [];
        this.errors = [];
        this.requestCount = 0;
    }

    // Генерация списка URL для парсинга
    generateUrls() {
        try {
            const fs = require('fs');
            const urlsFile = fs.readFileSync('./urls.txt', 'utf-8');
            const urls = urlsFile
                .split('\n')
                .filter(url => url.trim() && !url.startsWith('#'))
                .slice(0, CONFIG.maxRequests);

            console.log(`Загружено ${urls.length} URL из urls.txt`);
            return urls;
        } catch (error) {
            console.error('Ошибка чтения urls.txt:', error);
            return this.generateDefaultUrls();
        }
    }

    // Генерация URL по умолчанию (если файл отсутствует)
    generateDefaultUrls() {
        const baseUrls = [
            'https://olx.kz/d/nedvizhimost/prodazha-kvartir/',
            'https://olx.kz/d/nedvizhimost/arenda-kvartir/'
        ];

        // Можно добавить логику генерации URL для разных городов
        console.log('Используем базовые URL для тестирования');
        return baseUrls.slice(0, CONFIG.maxRequests);
    }

    // Случайная задержка
    async delay() {
        const ms = Math.floor(Math.random() * (CONFIG.delayMax - CONFIG.delayMin)) + CONFIG.delayMin;
        await this.logger.log(`Ожидание ${ms/1000} секунд перед следующим запросом...`);
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Парсинг одного URL
    async parseOne(url) {
        try {
            const startTime = Date.now();

            await this.logger.log(`[${this.requestCount + 1}/${CONFIG.maxRequests}] Парсинг OLX: ${url}`);

            const response = await fetch('http://localhost:3000/api/parse-olx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const responseTime = Date.now() - startTime;

            if (!response.ok) {
                if (response.status === 429) {
                    await this.logger.log(`Rate limit достигнут! Остановка.`, 'ERROR');
                    if (CONFIG.stopOnError) {
                        throw new Error('Rate limit reached');
                    }
                } else if (response.status === 403) {
                    await this.logger.log(`Доступ заблокирован OLX! Остановка.`, 'ERROR');
                    if (CONFIG.stopOnError) {
                        throw new Error('Access blocked by OLX');
                    }
                } else if (response.status === 422) {
                    await this.logger.log(`Объявление недоступно или удалено`, 'WARNING');
                    this.errors.push({
                        url,
                        error: 'Объявление недоступно',
                        timestamp: new Date().toISOString()
                    });
                    return null;
                }

                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            this.results.push({
                url,
                data: data.data,
                parsedAt: new Date().toISOString(),
                responseTime
            });

            await this.logger.log(`✓ Успешно (${responseTime}ms) - ${data.data?.title || 'без названия'}`);
            this.requestCount++;

            return data;

        } catch (error) {
            await this.logger.log(`✗ Ошибка: ${error.message}`, 'ERROR');
            this.errors.push({
                url,
                error: error.message,
                timestamp: new Date().toISOString()
            });

            if (CONFIG.stopOnError && (error.message.includes('blocked') || error.message.includes('Rate limit'))) {
                throw error;
            }

            return null;
        }
    }

    // Сохранение результатов
    async saveResults() {
        const timestamp = Date.now();
        const dir = CONFIG.saveDir;

        try {
            await fs.mkdir(dir, { recursive: true });

            // Сохраняем успешные результаты
            if (this.results.length > 0) {
                const successFile = path.join(dir, `olx-results-${timestamp}.json`);
                await fs.writeFile(successFile, JSON.stringify(this.results, null, 2));
                await this.logger.log(`Сохранено ${this.results.length} результатов в ${successFile}`);
            }

            // Сохраняем ошибки
            if (this.errors.length > 0) {
                const errorFile = path.join(dir, `olx-errors-${timestamp}.json`);
                await fs.writeFile(errorFile, JSON.stringify(this.errors, null, 2));
                await this.logger.log(`Сохранено ${this.errors.length} ошибок в ${errorFile}`);
            }

            // Сохраняем статистику
            const stats = {
                totalRequests: this.requestCount,
                successful: this.results.length,
                failed: this.errors.length,
                successRate: this.requestCount > 0 ? ((this.results.length / this.requestCount) * 100).toFixed(2) + '%' : '0%',
                startTime: this.startTime,
                endTime: new Date().toISOString(),
                duration: Date.now() - this.startTime,
                averageDelay: (CONFIG.delayMin + CONFIG.delayMax) / 2,
                estimatedTotalTime: this.requestCount * ((CONFIG.delayMin + CONFIG.delayMax) / 2)
            };

            const statsFile = path.join(dir, `olx-stats-${timestamp}.json`);
            await fs.writeFile(statsFile, JSON.stringify(stats, null, 2));

            return stats;
        } catch (error) {
            await this.logger.log(`Ошибка сохранения: ${error.message}`, 'ERROR');
        }
    }

    // Главный метод парсинга
    async run() {
        this.startTime = Date.now();

        await this.logger.log('='.repeat(50));
        await this.logger.log('ЗАПУСК БЕЗОПАСНОГО ПАРСЕРА OLX.KZ');
        await this.logger.log(`Настройки: ${JSON.stringify(CONFIG)}`);
        await this.logger.log('='.repeat(50));

        const urls = this.generateUrls();

        if (urls.length === 0) {
            await this.logger.log('Нет URL для парсинга!', 'ERROR');
            return;
        }

        await this.logger.log(`Найдено ${urls.length} URL для парсинга`);

        try {
            for (let i = 0; i < urls.length; i++) {
                // Парсим URL
                await this.parseOne(urls[i]);

                // Сохраняем промежуточные результаты
                if ((i + 1) % CONFIG.batchSize === 0) {
                    await this.saveResults();
                    await this.logger.log(`Промежуточное сохранение после ${i + 1} запросов`);
                }

                // Задержка перед следующим запросом (кроме последнего)
                if (i < urls.length - 1) {
                    await this.delay();
                }

                // Проверка на критические ошибки
                if (this.errors.length > 8) {
                    await this.logger.log('Слишком много ошибок подряд, остановка', 'WARNING');
                    break;
                }

                // Проверка на блокировку (если много 403/429 ошибок)
                const recentErrors = this.errors.slice(-5);
                const blockedErrors = recentErrors.filter(e =>
                    e.error.includes('blocked') ||
                    e.error.includes('Rate limit') ||
                    e.error.includes('403')
                );

                if (blockedErrors.length >= 3) {
                    await this.logger.log('Обнаружена блокировка, увеличиваем задержку', 'WARNING');
                    await new Promise(resolve => setTimeout(resolve, 120000)); // 2 минуты пауза
                }
            }
        } catch (error) {
            await this.logger.log(`КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`, 'ERROR');
        }

        // Финальное сохранение
        const stats = await this.saveResults();

        await this.logger.log('='.repeat(50));
        await this.logger.log('ПАРСИНГ OLX ЗАВЕРШЕН');
        await this.logger.log(`Обработано: ${this.requestCount}`);
        await this.logger.log(`Успешно: ${this.results.length}`);
        await this.logger.log(`Ошибок: ${this.errors.length}`);
        await this.logger.log(`Время: ${((Date.now() - this.startTime) / 1000 / 60).toFixed(2)} минут`);
        await this.logger.log('='.repeat(50));

        return stats;
    }
}

// Точка входа
async function main() {
    console.log('Проверка окружения для OLX парсера...');

    // Проверяем, запущен ли сервер Next.js
    try {
        const testResponse = await fetch('http://localhost:3000/api/parse-olx');
        if (!testResponse.ok && testResponse.status !== 405) {
            throw new Error('OLX API недоступен');
        }
    } catch (error) {
        console.error('❌ Ошибка: OLX API парсера не запущен!');
        console.error('Запустите сначала: cd olx && npm run dev');
        console.error('Или проверьте, что сервер запущен на порту 3000');
        process.exit(1);
    }

    console.log('✓ OLX API доступен');

    // Запускаем парсер
    const parser = new SafeOlxParser();
    await parser.run();

    console.log('\n✅ Готово! Проверьте папку ./parsed-data для результатов');
    console.log('📊 Логи сохранены в папке ./logs');
}

// Обработка завершения
process.on('SIGINT', async () => {
    console.log('\n\nПолучен сигнал остановки...');
    console.log('Сохранение данных...');
    process.exit(0);
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
    console.error('Необработанная ошибка:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Необработанное отклонение промиса:', reason);
    process.exit(1);
});

// Запуск
main().catch(error => {
    console.error('Фатальная ошибка:', error);
    process.exit(1);
});