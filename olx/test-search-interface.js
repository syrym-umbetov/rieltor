// test-search-interface.js - Тест поискового интерфейса
const fs = require('fs');

async function testSearchAPI() {
    console.log('🔧 Тестирование поискового API OLX\n');

    const testFilters = {
        priceMin: '10000000',
        priceMax: '25000000',
        rooms: '2',
        city: 'almaty'
    };

    console.log('📋 Фильтры для теста:');
    console.log(`💰 Цена: ${testFilters.priceMin} - ${testFilters.priceMax} тг`);
    console.log(`🚪 Комнаты: ${testFilters.rooms}`);
    console.log(`🏙️ Город: ${testFilters.city}\n`);

    try {
        console.log('📡 Отправляем запрос на поиск...');

        const response = await fetch('http://localhost:3001/api/search-olx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filters: testFilters
            })
        });

        console.log(`📊 Статус ответа: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            console.error('❌ Ошибка HTTP:', response.status);
            const errorData = await response.text();
            console.error('Ответ:', errorData);
            return;
        }

        const data = await response.json();
        console.log('\n✅ Поиск успешен!');
        console.log('='.repeat(60));

        if (data.data && data.data.properties) {
            const properties = data.data.properties;
            console.log(`🏠 Найдено объявлений: ${properties.length}`);
            console.log(`🔗 URL поиска: ${data.data.searchUrl}`);
            console.log(`⏱️  Время выполнения: ${data._stats.responseTime}ms\n`);

            if (properties.length > 0) {
                console.log('📋 Первые несколько объявлений:\n');

                properties.slice(0, 3).forEach((property, index) => {
                    console.log(`${index + 1}. ${property.title}`);
                    console.log(`   💰 Цена: ${property.price}`);
                    console.log(`   📍 Местоположение: ${property.location}`);
                    if (property.area) console.log(`   📐 Площадь: ${property.area}`);
                    if (property.rooms) console.log(`   🚪 Комнаты: ${property.rooms}`);
                    console.log(`   🖼️ Изображений: ${property.images.length}`);
                    if (property.url) console.log(`   🔗 Ссылка: ${property.url}`);
                    console.log('');
                });
            } else {
                console.log('ℹ️  Объявления не найдены для данных фильтров');
            }
        } else {
            console.log('⚠️  Неожиданная структура ответа:', data);
        }

    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.error('\n🚨 Сервер не запущен! Запустите: npm run dev');
        }
    }
}

async function testSingleParsingAPI() {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 Тестирование парсинга одного объявления\n');

    const testUrl = 'https://olx.kz/d/obyavlenie/dvuhkomnatnaya-kvartira-IDqgDUJ.html';

    try {
        console.log('📡 Отправляем запрос на парсинг...');
        console.log('🔗 URL:', testUrl);

        const response = await fetch('http://localhost:3001/api/parse-olx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: testUrl })
        });

        console.log(`📊 Статус ответа: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            console.error('❌ Ошибка HTTP:', response.status);
            const errorData = await response.text();
            console.error('Ответ:', errorData);
            return;
        }

        const data = await response.json();
        console.log('\n✅ Парсинг успешен!');
        console.log('='.repeat(60));

        const property = data.data;
        console.log(`📝 Заголовок: ${property.title}`);
        console.log(`💰 Цена: ${property.price}`);
        console.log(`📍 Местоположение: ${property.location}`);
        if (property.area) console.log(`📐 Площадь: ${property.area}`);
        if (property.rooms) console.log(`🚪 Комнаты: ${property.rooms}`);
        console.log(`🖼️ Изображений: ${property.images.length}`);
        console.log(`⏱️  Время выполнения: ${data._stats.responseTime}ms`);

    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);
    }
}

async function testAPIHealth() {
    try {
        console.log('🔍 Проверяем доступность API...');

        // Тестируем GET запрос к поисковому API (информация о фильтрах)
        const searchInfoResponse = await fetch('http://localhost:3001/api/search-olx');

        if (searchInfoResponse.ok) {
            const searchInfo = await searchInfoResponse.json();
            console.log('✅ Поисковый API доступен');
            console.log('📋 Доступные города:', searchInfo.availableFilters.cities.map(c => c.label).join(', '));
        } else {
            console.log('❌ Поисковый API недоступен:', searchInfoResponse.status);
        }

        // Тестируем GET запрос к API парсинга
        const parseResponse = await fetch('http://localhost:3001/api/parse-olx');

        if (parseResponse.ok) {
            console.log('✅ API парсинга доступен');
            return true;
        } else {
            console.log('❌ API парсинга недоступен:', parseResponse.status);
            return false;
        }
    } catch (error) {
        console.log('❌ API недоступен:', error.message);
        return false;
    }
}

async function main() {
    console.log('🎯 OLX Parser - Полное тестирование интерфейса\n');

    // Проверяем API
    const apiAvailable = await testAPIHealth();
    if (!apiAvailable) {
        console.log('\n🚨 Убедитесь что сервер запущен: npm run dev');
        return;
    }

    // Тестируем поиск по фильтрам
    await testSearchAPI();

    // Тестируем парсинг одного объявления
    await testSingleParsingAPI();

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Тестирование завершено!');
    console.log('🌐 Откройте браузер: http://localhost:3001');
    console.log('='.repeat(60));
}

main().catch(console.error);