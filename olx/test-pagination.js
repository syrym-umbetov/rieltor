// test-pagination.js - Тест пагинации OLX парсера
async function testPagination() {
    console.log('📄 Тест пагинации OLX парсера\n');

    // Ждем для обхода rate limiting
    console.log('⏳ Ожидание 20 секунд...');
    await new Promise(resolve => setTimeout(resolve, 20000));

    const testFilters = {
        city: 'almaty'
    };

    try {
        // Тестируем первую страницу
        console.log('📡 Тестируем страницу 1...');
        const response1 = await fetch('http://localhost:3001/api/search-olx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filters: { ...testFilters, page: 1 }
            })
        });

        if (!response1.ok) {
            console.error(`❌ Ошибка HTTP страница 1: ${response1.status}`);
            return;
        }

        const data1 = await response1.json();
        console.log(`✅ Страница 1: ${data1.data.properties.length} объявлений`);
        console.log(`🔗 URL: ${data1.data.searchUrl}`);

        // Сохраняем ID объявлений с первой страницы
        const page1Ids = new Set(data1.data.properties.map(p => p.propertyId));
        console.log(`🆔 Первые 3 ID со страницы 1: ${Array.from(page1Ids).slice(0, 3).join(', ')}`);

        // Ждем перед запросом второй страницы
        console.log('\n⏳ Ожидание 15 секунд перед запросом страницы 2...');
        await new Promise(resolve => setTimeout(resolve, 15000));

        // Тестируем вторую страницу
        console.log('📡 Тестируем страницу 2...');
        const response2 = await fetch('http://localhost:3001/api/search-olx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filters: { ...testFilters, page: 2 }
            })
        });

        if (!response2.ok) {
            console.error(`❌ Ошибка HTTP страница 2: ${response2.status}`);
            return;
        }

        const data2 = await response2.json();
        console.log(`✅ Страница 2: ${data2.data.properties.length} объявлений`);
        console.log(`🔗 URL: ${data2.data.searchUrl}`);

        // Проверяем, что на второй странице есть параметр page=2
        if (data2.data.searchUrl.includes('page=2')) {
            console.log('✅ Пагинация работает - URL содержит page=2');
        } else {
            console.log('⚠️ Пагинация не работает - URL не содержит page=2');
        }

        // Сохраняем ID объявлений со второй страницы
        const page2Ids = new Set(data2.data.properties.map(p => p.propertyId));
        console.log(`🆔 Первые 3 ID со страницы 2: ${Array.from(page2Ids).slice(0, 3).join(', ')}`);

        // Проверяем пересечение объявлений между страницами
        const intersection = new Set([...page1Ids].filter(id => page2Ids.has(id)));
        console.log(`\n🔍 Анализ уникальности:`);
        console.log(`   📄 Страница 1: ${page1Ids.size} уникальных объявлений`);
        console.log(`   📄 Страница 2: ${page2Ids.size} уникальных объявлений`);
        console.log(`   🔄 Дубликаты между страницами: ${intersection.size}`);

        if (intersection.size === 0) {
            console.log('✅ Отлично! Объявления на разных страницах не пересекаются');
        } else {
            console.log('⚠️ Обнаружены дубликаты между страницами');
            console.log(`🔄 Дублирующиеся ID: ${Array.from(intersection).join(', ')}`);
        }

        // Проверяем качество изображений на обеих страницах
        const page1WithImages = data1.data.properties.filter(p => p.images.length > 0);
        const page2WithImages = data2.data.properties.filter(p => p.images.length > 0);

        console.log(`\n🖼️ Статистика изображений:`);
        console.log(`   📄 Страница 1: ${page1WithImages.length}/${data1.data.properties.length} с изображениями (${Math.round((page1WithImages.length / data1.data.properties.length) * 100)}%)`);
        console.log(`   📄 Страница 2: ${page2WithImages.length}/${data2.data.properties.length} с изображениями (${Math.round((page2WithImages.length / data2.data.properties.length) * 100)}%)`);

        // Примеры объявлений с каждой страницы
        console.log(`\n📋 Примеры объявлений:`);
        console.log(`\n📄 Страница 1:`);
        data1.data.properties.slice(0, 2).forEach((prop, index) => {
            console.log(`   ${index + 1}. ${prop.title.substring(0, 50)}... - ${prop.price}`);
            console.log(`      🆔 ID: ${prop.propertyId}`);
            console.log(`      🖼️ Изображений: ${prop.images.length}`);
        });

        console.log(`\n📄 Страница 2:`);
        data2.data.properties.slice(0, 2).forEach((prop, index) => {
            console.log(`   ${index + 1}. ${prop.title.substring(0, 50)}... - ${prop.price}`);
            console.log(`      🆔 ID: ${prop.propertyId}`);
            console.log(`      🖼️ Изображений: ${prop.images.length}`);
        });

        console.log(`\n🎯 Результат тестирования пагинации:`);
        if (data2.data.searchUrl.includes('page=2') && intersection.size === 0) {
            console.log('✅ Пагинация работает корректно!');
            console.log('✅ Разные страницы возвращают уникальные объявления');
            console.log('✅ URL правильно формируется с параметром page');
        } else {
            console.log('⚠️ Пагинация требует доработки');
        }

    } catch (error) {
        console.error('❌ Ошибка тестирования пагинации:', error.message);
    }
}

testPagination().catch(console.error);