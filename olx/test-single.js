// test-single.js - Тест парсинга одного URL
const https = require('https');

// Тестовый URL (замените на реальный URL объявления OLX)
const TEST_URL = 'https://olx.kz/d/nedvizhimost/prodazha-kvartir/almaty/prodam-1-komnatnuyu-kvartiru-v-almaty-IDyYK8N.html';

async function testSingleUrl() {
    console.log('🧪 Тестирование парсера OLX...');
    console.log('URL:', TEST_URL);

    try {
        const response = await fetch('http://localhost:3000/api/parse-olx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: TEST_URL
            })
        });

        if (!response.ok) {
            console.error(`❌ Ошибка HTTP: ${response.status} ${response.statusText}`);
            const errorData = await response.text();
            console.error('Ответ:', errorData);
            return;
        }

        const data = await response.json();

        console.log('\n✅ Успешно! Результат парсинга:');
        console.log('='.repeat(50));
        console.log('📝 Заголовок:', data.data.title);
        console.log('💰 Цена:', data.data.price);
        console.log('📍 Город:', data.data.city);
        console.log('🏠 Район:', data.data.district);
        console.log('📐 Площадь:', data.data.area);
        console.log('🚪 Комнаты:', data.data.rooms);
        console.log('📱 Контакт:', data.data.contact?.name || 'не найден');
        console.log('🖼️ Изображений:', data.data.images.length);
        console.log('📊 ID объявления:', data.data.propertyId || 'не найден');

        if (data.data.images.length > 0) {
            console.log('🖼️ Первое изображение:', data.data.images[0]);
        }

        console.log('\n📈 Статистика API:');
        console.log('⏱️  Время ответа:', data._stats.responseTime + 'ms');
        console.log('📅 Запросов сегодня:', data._stats.requestsToday);
        console.log('🔢 Всего запросов:', data._stats.totalRequests);

    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.error('\n🚨 Сервер не запущен! Запустите сначала: npm run dev');
        }
    }
}

// Проверка доступности API
async function checkApiHealth() {
    try {
        const response = await fetch('http://localhost:3000/api/parse-olx');

        if (response.ok) {
            console.log('✅ API доступен');
            return true;
        } else {
            console.log('❌ API недоступен:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Ошибка подключения к API:', error.message);
        return false;
    }
}

async function main() {
    console.log('OLX Parser - Тест одного URL\n');

    // Проверяем API
    const apiAvailable = await checkApiHealth();
    if (!apiAvailable) {
        console.log('Убедитесь что сервер запущен: npm run dev');
        return;
    }

    // Тестируем парсинг
    await testSingleUrl();
}

main().catch(console.error);