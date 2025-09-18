// final-test.js - Финальный тест с задержкой
async function finalTest() {
    console.log('🎯 Финальный тест OLX парсера\n');

    // Ждем 30 секунд чтобы обойти rate limiting
    console.log('⏳ Ожидание 30 секунд для обхода rate limiting...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    const testFilters = {
        city: 'almaty'
    };

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

        if (!response.ok) {
            console.error(`❌ Ошибка HTTP: ${response.status}`);
            if (response.status === 429) {
                console.error('⏳ Rate limit. Подождите еще немного...');
            }
            return;
        }

        const data = await response.json();

        if (data.data && data.data.properties) {
            const properties = data.data.properties;
            console.log(`\n✅ Успешно найдено: ${properties.length} объявлений`);
            console.log(`⏱️  Время выполнения: ${data._stats.responseTime}ms`);
            console.log(`🔗 URL поиска: ${data.data.searchUrl}\n`);

            // Статистика изображений
            const withImages = properties.filter(p => p.images.length > 0);
            const olxCdnImages = properties.filter(p =>
                p.images.length > 0 &&
                p.images[0].includes('frankfurt.apollo.olxcdn.com')
            );

            console.log('📊 Итоговая статистика:');
            console.log(`   🏠 Всего объявлений: ${properties.length}`);
            console.log(`   🖼️ С изображениями: ${withImages.length}`);
            console.log(`   ✅ С качественными фото: ${olxCdnImages.length}`);
            console.log(`   💰 Диапазон цен: от ${Math.min(...properties.map(p => {
                const priceMatch = p.price.match(/[\d\s]+/);
                return priceMatch ? parseInt(priceMatch[0].replace(/\s/g, '')) : 0;
            }).filter(p => p > 0)).toLocaleString()} до ${Math.max(...properties.map(p => {
                const priceMatch = p.price.match(/[\d\s]+/);
                return priceMatch ? parseInt(priceMatch[0].replace(/\s/g, '')) : 0;
            })).toLocaleString()} тг`);

            console.log('\n🎉 Примеры объявлений с изображениями:');
            withImages.slice(0, 3).forEach((property, index) => {
                console.log(`\n${index + 1}. ${property.title}`);
                console.log(`   💰 ${property.price}`);
                console.log(`   📍 ${property.location}`);
                console.log(`   🖼️ ${property.images[0]}`);
            });

            console.log('\n🌐 Веб-интерфейс доступен по адресу: http://localhost:3001');
            console.log('🎯 Парсер OLX полностью готов к использованию!');

        } else {
            console.log('⚠️  Неожиданная структура ответа');
        }

    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);
    }
}

finalTest().catch(console.error);