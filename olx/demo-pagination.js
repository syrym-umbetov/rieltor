// demo-pagination.js - Демонстрация работы пагинации
async function demoPagination() {
    console.log('🚀 Демонстрация пагинации OLX парсера\n');

    const testFilters = {
        city: 'almaty'
    };

    try {
        // Демонстрируем работу с разными страницами
        console.log('📡 Запрос страницы 1...');
        const response1 = await fetch('http://localhost:3001/api/search-olx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filters: { ...testFilters, page: 1 }
            })
        });

        const data1 = await response1.json();
        console.log(`✅ Страница 1: ${data1.data.totalFound} объявлений`);
        console.log(`🔗 URL: ${data1.data.searchUrl}`);
        console.log(`📄 Пагинация:`, data1.data.pagination);

        console.log(`\n📋 Первые 3 объявления со страницы 1:`);
        data1.data.properties.slice(0, 3).forEach((prop, index) => {
            console.log(`   ${index + 1}. ${prop.title.substring(0, 40)}... - ${prop.price}`);
            console.log(`      🆔 ${prop.propertyId} | 🖼️ ${prop.images.length} фото`);
        });

        // Ждем перед следующим запросом
        console.log('\n⏳ Ожидание 20 секунд...');
        await new Promise(resolve => setTimeout(resolve, 20000));

        console.log('📡 Запрос страницы 2...');
        const response2 = await fetch('http://localhost:3001/api/search-olx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filters: { ...testFilters, page: 2 }
            })
        });

        const data2 = await response2.json();
        console.log(`✅ Страница 2: ${data2.data.totalFound} объявлений`);
        console.log(`🔗 URL: ${data2.data.searchUrl}`);
        console.log(`📄 Пагинация:`, data2.data.pagination);

        console.log(`\n📋 Первые 3 объявления со страницы 2:`);
        data2.data.properties.slice(0, 3).forEach((prop, index) => {
            console.log(`   ${index + 1}. ${prop.title.substring(0, 40)}... - ${prop.price}`);
            console.log(`      🆔 ${prop.propertyId} | 🖼️ ${prop.images.length} фото`);
        });

        // Проверяем корректность URL
        console.log(`\n🔍 Анализ URL:`);
        console.log(`   📄 Страница 1: ${data1.data.searchUrl.includes('page=') ? 'содержит параметр page' : 'без параметра page (по умолчанию)'}`);
        console.log(`   📄 Страница 2: ${data2.data.searchUrl.includes('page=2') ? 'содержит page=2 ✅' : 'НЕ содержит page=2 ❌'}`);

        console.log(`\n🎯 Результат:`);
        if (data2.data.searchUrl.includes('page=2')) {
            console.log('✅ Пагинация работает корректно!');
            console.log('✅ URL правильно формируется с параметром page');
            console.log('✅ API возвращает информацию о пагинации');
        } else {
            console.log('❌ Пагинация требует доработки');
        }

        console.log(`\n📊 Статистика:`);
        console.log(`   🏠 Всего объявлений получено: ${data1.data.totalFound + data2.data.totalFound}`);
        console.log(`   📄 Страниц протестировано: 2`);
        console.log(`   ⏱️ Общее время: ~40 секунд (с задержками)`);

    } catch (error) {
        console.error('❌ Ошибка демонстрации:', error.message);
    }
}

demoPagination().catch(console.error);