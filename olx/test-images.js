// test-images.js - Тест изображений в поиске
async function testImageUrls() {
    console.log('🖼️ Тест URL изображений OLX\n');

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
            console.error('❌ Ошибка HTTP:', response.status);
            return;
        }

        const data = await response.json();

        if (data.data && data.data.properties) {
            const properties = data.data.properties;
            console.log(`🏠 Найдено объявлений: ${properties.length}\n`);

            console.log('🖼️ Примеры URL изображений:\n');

            properties.slice(0, 5).forEach((property, index) => {
                console.log(`${index + 1}. ${property.title.substring(0, 50)}...`);
                console.log(`   💰 Цена: ${property.price}`);
                if (property.images.length > 0) {
                    console.log(`   🖼️ Изображение: ${property.images[0]}`);

                    // Проверяем, что URL изображения корректно обработан
                    const imageUrl = property.images[0];
                    if (imageUrl.includes('frankfurt.apollo.olxcdn.com')) {
                        if (imageUrl.includes(';s=800x600;q=80') || !imageUrl.includes(';s=216x152;q=50')) {
                            console.log('   ✅ URL изображения корректно обработан');
                        } else {
                            console.log('   ❌ URL изображения не обработан');
                        }
                    }
                } else {
                    console.log('   🖼️ Изображение: отсутствует');
                }
                console.log('');
            });

            // Статистика изображений
            const withImages = properties.filter(p => p.images.length > 0);
            const processedImages = properties.filter(p =>
                p.images.length > 0 &&
                p.images[0].includes('frankfurt.apollo.olxcdn.com') &&
                p.images[0].includes(';s=800x600;q=80')
            );

            console.log('📊 Статистика изображений:');
            console.log(`   🖼️ Объявлений с изображениями: ${withImages.length}/${properties.length}`);
            console.log(`   ✅ Корректно обработанных: ${processedImages.length}/${withImages.length}`);

        } else {
            console.log('⚠️  Неожиданная структура ответа');
        }

    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);
    }
}

testImageUrls().catch(console.error);