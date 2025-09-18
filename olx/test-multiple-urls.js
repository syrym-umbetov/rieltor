// test-multiple-urls.js - Тест с несколькими URL
const fs = require('fs');

async function testMultipleUrls() {
    console.log('🔧 Тестирование парсера OLX с несколькими URL\n');

    // Читаем URL из файла
    const urlsContent = fs.readFileSync('./urls.txt', 'utf-8');
    const urls = urlsContent
        .split('\n')
        .filter(url => url.trim() && !url.startsWith('#'))
        .slice(0, 3); // Берем только первые 3 для теста

    console.log(`📋 Тестируем ${urls.length} URL:\n`);

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i].trim();
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔍 Тест ${i + 1}/${urls.length}: ${url}`);
        console.log(`${'='.repeat(80)}`);

        try {
            const response = await fetch('http://localhost:3000/api/parse-olx', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                console.error(`❌ Ошибка HTTP: ${response.status} ${response.statusText}`);
                const errorData = await response.text();
                console.error('Ответ:', errorData);
                continue;
            }

            const data = await response.json();
            const property = data.data;

            console.log('✅ Результат:');
            console.log(`📝 Заголовок: ${property.title}`);
            console.log(`💰 Цена: ${property.price}`);
            console.log(`📍 Местоположение: ${property.location}`);
            console.log(`📐 Площадь: ${property.area || 'не указана'}`);
            console.log(`🚪 Комнаты: ${property.rooms || 'не указаны'}`);
            console.log(`📸 Изображений: ${property.images.length}`);
            console.log(`⏱️  Время ответа: ${data._stats.responseTime}ms`);

            if (property.description && property.description.length > 100) {
                console.log(`📝 Описание: ${property.description.substring(0, 100)}...`);
            }

            // Небольшая задержка между запросами
            if (i < urls.length - 1) {
                console.log('\n⏳ Пауза 3 секунды...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

        } catch (error) {
            console.error(`❌ Ошибка парсинга: ${error.message}`);
        }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('🎉 Тестирование завершено!');
    console.log(`${'='.repeat(80)}`);
}

// Проверка доступности API
async function checkApiHealth() {
    try {
        const response = await fetch('http://localhost:3000/api/parse-olx');
        return response.ok;
    } catch (error) {
        console.log('❌ API недоступен. Запустите: npm run dev');
        return false;
    }
}

async function main() {
    if (!(await checkApiHealth())) {
        return;
    }

    await testMultipleUrls();
}

main().catch(console.error);