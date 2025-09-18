// debug-images.js - Отладка URL изображений
async function debugImageUrls() {
    console.log('🔍 Отладка URL изображений OLX\n');

    const testFilters = {
        city: 'almaty'
    };

    try {
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
            console.error('❌ Ошибка HTTP:', response.status);
            return;
        }

        const data = await response.json();

        if (data.data && data.data.properties) {
            const properties = data.data.properties;
            console.log(`🏠 Найдено объявлений: ${properties.length}\n`);

            // Анализируем все типы URL изображений
            const imageUrls = [];
            const urlTypes = {};

            properties.forEach((property, index) => {
                if (property.images.length > 0) {
                    const imageUrl = property.images[0];
                    imageUrls.push(imageUrl);

                    // Классифицируем URL по домену
                    if (imageUrl.includes('frankfurt.apollo.olxcdn.com')) {
                        urlTypes['OLX CDN'] = (urlTypes['OLX CDN'] || 0) + 1;
                    } else if (imageUrl.includes('olx')) {
                        urlTypes['OLX Other'] = (urlTypes['OLX Other'] || 0) + 1;
                    } else if (imageUrl.startsWith('data:')) {
                        urlTypes['Data URL'] = (urlTypes['Data URL'] || 0) + 1;
                    } else {
                        urlTypes['Other'] = (urlTypes['Other'] || 0) + 1;
                    }
                }
            });

            console.log('📊 Типы URL изображений:');
            Object.entries(urlTypes).forEach(([type, count]) => {
                console.log(`   ${type}: ${count}`);
            });

            console.log('\n🔍 Примеры всех типов URL:\n');

            // Показываем примеры каждого типа
            const examples = {};
            properties.forEach((property) => {
                if (property.images.length > 0) {
                    const imageUrl = property.images[0];
                    let type;

                    if (imageUrl.includes('frankfurt.apollo.olxcdn.com')) {
                        type = 'OLX CDN';
                    } else if (imageUrl.includes('olx')) {
                        type = 'OLX Other';
                    } else if (imageUrl.startsWith('data:')) {
                        type = 'Data URL';
                    } else {
                        type = 'Other';
                    }

                    if (!examples[type]) {
                        examples[type] = {
                            title: property.title,
                            url: imageUrl
                        };
                    }
                }
            });

            Object.entries(examples).forEach(([type, example]) => {
                console.log(`${type}:`);
                console.log(`   Объявление: ${example.title.substring(0, 50)}...`);
                console.log(`   URL: ${example.url}`);
                console.log('');
            });

            // Показываем первые 10 URL без обработки для анализа
            console.log('📋 Первые 10 оригинальных URL изображений:');
            properties.slice(0, 10).forEach((property, index) => {
                if (property.images.length > 0) {
                    console.log(`${index + 1}. ${property.images[0]}`);
                } else {
                    console.log(`${index + 1}. [нет изображения]`);
                }
            });

        } else {
            console.log('⚠️  Неожиданная структура ответа');
        }

    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);
    }
}

debugImageUrls().catch(console.error);