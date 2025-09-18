// test-validation.js - Тест валидации URL и базовой функциональности
const https = require('https');

async function testUrlValidation() {
    console.log('🧪 Тестирование валидации URL...');

    const testCases = [
        {
            name: 'Пустой URL',
            url: '',
            expectError: true,
            expectedStatus: 400
        },
        {
            name: 'Неверный домен',
            url: 'https://example.com/some-ad',
            expectError: true,
            expectedStatus: 400
        },
        {
            name: 'Правильный домен OLX (несуществующий URL)',
            url: 'https://olx.kz/test-url',
            expectError: false, // API должен принять URL, но парсинг может не сработать
            expectedStatus: 200
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n▶️  Тест: ${testCase.name}`);
        console.log(`   URL: ${testCase.url || '(пустой)'}`);

        try {
            const response = await fetch('http://localhost:3000/api/parse-olx', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: testCase.url
                })
            });

            const data = await response.json();

            if (testCase.expectError) {
                if (!response.ok) {
                    console.log(`   ✅ Ожидаемая ошибка: ${response.status} - ${data.error}`);
                } else {
                    console.log(`   ❌ Ожидалась ошибка, но получен успех`);
                }
            } else {
                if (response.ok) {
                    console.log(`   ✅ Запрос принят (${response.status})`);
                } else {
                    console.log(`   ⚠️  Ошибка: ${response.status} - ${data.error}`);
                }
            }
        } catch (error) {
            console.log(`   ❌ Исключение: ${error.message}`);
        }
    }
}

async function testRateLimits() {
    console.log('\n🧪 Тестирование rate limit...');

    try {
        // Делаем несколько быстрых запросов
        for (let i = 0; i < 3; i++) {
            console.log(`   Запрос ${i + 1}/3...`);

            const response = await fetch('http://localhost:3000/api/parse-olx', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: 'https://olx.kz/test'
                })
            });

            if (response.status === 429) {
                const data = await response.json();
                console.log(`   ✅ Rate limit работает: ${data.error}`);
                console.log(`   ⏳ Повторить через: ${data.retryAfter} секунд`);
                break;
            } else {
                console.log(`   📝 Статус: ${response.status}`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Ошибка тестирования rate limit: ${error.message}`);
    }
}

async function testApiStats() {
    console.log('\n🧪 Тестирование статистики...');

    try {
        const response = await fetch('http://localhost:3000/api/parse-olx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: 'https://olx.kz/test-stats'
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data._stats) {
                console.log(`   ✅ Статистика получена:`);
                console.log(`   📊 Время ответа: ${data._stats.responseTime}ms`);
                console.log(`   📅 Запросов сегодня: ${data._stats.requestsToday}`);
                console.log(`   🔢 Всего запросов: ${data._stats.totalRequests}`);
            } else {
                console.log(`   ❌ Статистика не найдена в ответе`);
            }
        } else {
            console.log(`   ⚠️  Ошибка получения статистики: ${response.status}`);
        }
    } catch (error) {
        console.log(`   ❌ Исключение: ${error.message}`);
    }
}

async function main() {
    console.log('🔧 OLX Parser - Тесты валидации и функциональности\n');

    // Проверяем доступность API
    try {
        const healthCheck = await fetch('http://localhost:3000/api/parse-olx');
        if (!healthCheck.ok) {
            console.log('❌ API недоступен');
            return;
        }
        console.log('✅ API доступен\n');
    } catch (error) {
        console.log('❌ Сервер не запущен. Запустите: npm run dev');
        return;
    }

    // Запускаем тесты
    await testUrlValidation();
    await testRateLimits();
    await testApiStats();

    console.log('\n🎉 Тестирование завершено!');
    console.log('\n📋 Что протестировано:');
    console.log('✅ Валидация URL');
    console.log('✅ Обработка ошибок');
    console.log('✅ Rate limiting');
    console.log('✅ Статистика API');
    console.log('\n💡 Для тестирования с реальными URL добавьте их в urls.txt');
}

main().catch(console.error);