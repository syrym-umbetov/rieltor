// scripts/safe-parser.js
// Запускать через: node scripts/safe-parser.js

const fs = require('fs').promises;
const path = require('path');

// Конфигурация безопасного парсинга
const CONFIG = {
    maxRequests: 100,        // Максимум запросов
    delayMin: 30000,         // Минимум 30 секунд между запросами
    delayMax: 60000,         // Максимум 60 секунд
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

// Парсер
class SafeKrishaParser {
    constructor() {
        this.logger = new Logger();
        this.results = [];
        this.errors = [];
        this.requestCount = 0;
    }

    // Генерация списка URL для парсинга
    generateUrls() {
        // Загрузка из файла
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
            return [];
        }
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

            await this.logger.log(`[${this.requestCount + 1}/${CONFIG.maxRequests}] Парсинг: ${url}`);

            const response = await fetch('http://localhost:3000/api/parse-krisha', {
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
                    await this.logger.log(`Доступ заблокирован! Остановка.`, 'ERROR');
                    if (CONFIG.stopOnError) {
                        throw new Error('Access blocked');
                    }
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

            await this.logger.log(`✓ Успешно (${responseTime}ms)`);
            this.requestCount++;

            return data;

        } catch (error) {
            await this.logger.log(`✗ Ошибка: ${error.message}`, 'ERROR');
            this.errors.push({
                url,
                error: error.message,
                timestamp: new Date().toISOString()
            });

            if (CONFIG.stopOnError && error.message.includes('blocked')) {
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
                const successFile = path.join(dir, `results-${timestamp}.json`);
                await fs.writeFile(successFile, JSON.stringify(this.results, null, 2));
                await this.logger.log(`Сохранено ${this.results.length} результатов в ${successFile}`);
            }

            // Сохраняем ошибки
            if (this.errors.length > 0) {
                const errorFile = path.join(dir, `errors-${timestamp}.json`);
                await fs.writeFile(errorFile, JSON.stringify(this.errors, null, 2));
                await this.logger.log(`Сохранено ${this.errors.length} ошибок в ${errorFile}`);
            }

            // Сохраняем статистику
            const stats = {
                totalRequests: this.requestCount,
                successful: this.results.length,
                failed: this.errors.length,
                successRate: ((this.results.length / this.requestCount) * 100).toFixed(2) + '%',
                startTime: this.startTime,
                endTime: new Date().toISOString(),
                duration: Date.now() - this.startTime
            };

            const statsFile = path.join(dir, `stats-${timestamp}.json`);
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
        await this.logger.log('ЗАПУСК БЕЗОПАСНОГО ПАРСЕРА KRISHA.KZ');
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
                if (this.errors.length > 5) {
                    await this.logger.log('Слишком много ошибок, остановка', 'WARNING');
                    break;
                }
            }
        } catch (error) {
            await this.logger.log(`КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`, 'ERROR');
        }

        // Финальное сохранение
        const stats = await this.saveResults();

        await this.logger.log('='.repeat(50));
        await this.logger.log('ПАРСИНГ ЗАВЕРШЕН');
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
    console.log('Проверка окружения...');

    // Проверяем, запущен ли сервер Next.js
    try {
        const testResponse = await fetch('http://localhost:3000/api/parse-krisha');
        if (!testResponse.ok && testResponse.status !== 405) {
            throw new Error('API недоступен');
        }
    } catch (error) {
        console.error('❌ Ошибка: API парсера не запущен!');
        console.error('Запустите сначала: npm run dev');
        process.exit(1);
    }

    console.log('✓ API доступен');

    // Запускаем парсер
    const parser = new SafeKrishaParser();
    await parser.run();

    console.log('\n✅ Готово! Проверьте папку ./parsed-data для результатов');
}

// Обработка завершения
process.on('SIGINT', async () => {
    console.log('\n\nПолучен сигнал остановки...');
    console.log('Сохранение данных...');
    process.exit(0);
});

// Запуск
main().catch(error => {
    console.error('Фатальная ошибка:', error);
    process.exit(1);
});