// test-simple-search.js - Простой тест поиска
async function testSimpleSearch() {
    console.log('🔧 Тест простого поиска OLX\n');

    // Более широкие фильтры
    const testFilters = {
        city: 'almaty'
        // Оставляем остальные фильтры пустыми для более широкого поиска
    };

    console.log('📋 Фильтры для теста:');
    console.log(`🏙️ Город: ${testFilters.city}`);
    console.log('💰 Цена: без ограничений');
    console.log('🚪 Комнаты: любое количество\n');

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
                console.log('📋 Найденные объявления:\n');

                properties.forEach((property, index) => {
                    console.log(`${index + 1}. ${property.title}`);
                    console.log(`   💰 Цена: ${property.price}`);
                    console.log(`   📍 Местоположение: ${property.location}`);
                    if (property.area) console.log(`   📐 Площадь: ${property.area}`);
                    if (property.rooms) console.log(`   🚪 Комнаты: ${property.rooms}`);
                    console.log(`   🖼️ Изображений: ${property.images.length}`);
                    if (property.url) console.log(`   🔗 Ссылка: ${property.url.substring(0, 80)}...`);
                    console.log('');
                });

                console.log(`\n🎯 Успешно найдено ${properties.length} объявлений!`);
            } else {
                console.log('ℹ️  Объявления не найдены. Возможно, нужно изменить фильтры или проверить парсинг HTML.');
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

testSimpleSearch().catch(console.error);