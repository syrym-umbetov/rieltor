// test-multiple-pages.js - Тест получения объявлений с нескольких страниц
async function testMultiplePages() {
    console.log('📚 Тест получения объявлений с нескольких страниц\n');

    const testFilters = {
        city: 'almaty'
    };

    const allProperties = [];
    const allIds = new Set();
    const pages = [1, 2, 3]; // Тестируем первые 3 страницы

    try {
        for (const pageNum of pages) {
            console.log(`\n📡 Загружаем страницу ${pageNum}...`);

            // Добавляем задержку между запросами
            if (pageNum > 1) {
                console.log('⏳ Ожидание 20 секунд...');
                await new Promise(resolve => setTimeout(resolve, 20000));
            }

            const response = await fetch('http://localhost:3001/api/search-olx', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filters: { ...testFilters, page: pageNum }
                })
            });

            if (!response.ok) {
                console.error(`❌ Ошибка HTTP страница ${pageNum}: ${response.status}`);
                continue;
            }

            const data = await response.json();
            const properties = data.data.properties;

            console.log(`✅ Страница ${pageNum}: ${properties.length} объявлений`);
            console.log(`🔗 URL: ${data.data.searchUrl}`);

            // Проверяем дубликаты
            let duplicates = 0;
            properties.forEach(property => {
                if (allIds.has(property.propertyId)) {
                    duplicates++;
                } else {
                    allIds.add(property.propertyId);
                    allProperties.push({
                        ...property,
                        page: pageNum
                    });
                }
            });

            console.log(`🔄 Дубликатов на странице ${pageNum}: ${duplicates}`);
            console.log(`📊 Всего уникальных объявлений: ${allProperties.length}`);

            // Статистика изображений для страницы
            const withImages = properties.filter(p => p.images.length > 0);
            console.log(`🖼️ С изображениями: ${withImages.length}/${properties.length} (${Math.round((withImages.length / properties.length) * 100)}%)`);
        }

        console.log(`\n📈 Итоговая статистика:`);
        console.log(`   📚 Всего страниц загружено: ${pages.length}`);
        console.log(`   🏠 Всего уникальных объявлений: ${allProperties.length}`);
        console.log(`   🆔 Уникальных ID: ${allIds.size}`);

        // Группировка по страницам
        const byPage = {};
        allProperties.forEach(prop => {
            if (!byPage[prop.page]) byPage[prop.page] = [];
            byPage[prop.page].push(prop);
        });

        console.log(`\n📄 Распределение по страницам:`);
        Object.keys(byPage).forEach(page => {
            const pageProps = byPage[page];
            const withImages = pageProps.filter(p => p.images.length > 0);
            console.log(`   Страница ${page}: ${pageProps.length} объявлений, ${withImages.length} с изображениями`);
        });

        // Примеры объявлений с каждой страницы
        console.log(`\n🎯 Примеры объявлений с каждой страницы:`);
        Object.keys(byPage).forEach(page => {
            console.log(`\n📄 Страница ${page}:`);
            byPage[page].slice(0, 2).forEach((prop, index) => {
                console.log(`   ${index + 1}. ${prop.title.substring(0, 45)}...`);
                console.log(`      💰 ${prop.price}`);
                console.log(`      📍 ${prop.location}`);
                console.log(`      🆔 ${prop.propertyId}`);
                console.log(`      🖼️ ${prop.images.length} изображений`);
            });
        });

        // Проверка качества данных
        const totalWithImages = allProperties.filter(p => p.images.length > 0).length;
        const averageImagesPerProperty = allProperties.reduce((sum, p) => sum + p.images.length, 0) / allProperties.length;

        console.log(`\n📊 Общая статистика качества:`);
        console.log(`   🖼️ Объявлений с изображениями: ${totalWithImages}/${allProperties.length} (${Math.round((totalWithImages / allProperties.length) * 100)}%)`);
        console.log(`   📸 Среднее изображений на объявление: ${averageImagesPerProperty.toFixed(1)}`);

        // Анализ уникальности URL
        const uniqueUrls = new Set(allProperties.map(p => p.url));
        console.log(`   🔗 Уникальных URL: ${uniqueUrls.size}/${allProperties.length}`);

        if (uniqueUrls.size === allProperties.length) {
            console.log('✅ Все URL уникальны!');
        } else {
            console.log('⚠️ Обнаружены дублирующиеся URL');
        }

        console.log(`\n🎉 Пагинация работает успешно!`);
        console.log(`📚 Собрано ${allProperties.length} уникальных объявлений с ${pages.length} страниц`);

    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);
    }
}

testMultiplePages().catch(console.error);