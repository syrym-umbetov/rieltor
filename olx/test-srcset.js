// test-srcset.js - Тест извлечения изображений из srcset
async function testSrcsetExtraction() {
    console.log('🖼️ Тест извлечения изображений из srcset\n');

    // Пауза для обхода rate limiting
    console.log('⏳ Ждем 10 секунд...');
    await new Promise(resolve => setTimeout(resolve, 10000));

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
                console.error('⏳ Rate limit. Попробуйте позже');
            }
            return;
        }

        const data = await response.json();

        if (data.data && data.data.properties) {
            const properties = data.data.properties;
            console.log(`\n✅ Найдено объявлений: ${properties.length}`);

            // Статистика изображений
            const withImages = properties.filter(p => p.images.length > 0);
            const highQualityImages = properties.filter(p =>
                p.images.length > 0 &&
                (p.images[0].includes('510x') || p.images[0].includes('800x'))
            );

            console.log('\n📊 Статистика изображений:');
            console.log(`   🖼️ Объявлений с изображениями: ${withImages.length}/${properties.length}`);
            console.log(`   ✨ С изображениями высокого качества: ${highQualityImages.length}/${withImages.length}`);

            if (withImages.length > 0) {
                console.log('\n🎯 Примеры найденных изображений:');

                withImages.slice(0, 5).forEach((property, index) => {
                    console.log(`\n${index + 1}. ${property.title.substring(0, 40)}...`);
                    console.log(`   💰 ${property.price}`);
                    console.log(`   🖼️ ${property.images[0]}`);

                    // Анализируем качество изображения
                    const imageUrl = property.images[0];
                    if (imageUrl.includes('510x') || imageUrl.includes('800x')) {
                        console.log('   ✅ Высокое качество');
                    } else if (imageUrl.includes('216x')) {
                        console.log('   ⚠️ Низкое качество');
                    } else {
                        console.log('   ❓ Неизвестное качество');
                    }
                });

                // Процент объявлений с изображениями
                const percentage = Math.round((withImages.length / properties.length) * 100);
                console.log(`\n📈 Показатель успешности: ${percentage}% объявлений имеют изображения`);

                if (percentage > 80) {
                    console.log('🎉 Отлично! Большинство объявлений имеют изображения');
                } else if (percentage > 50) {
                    console.log('👍 Хорошо! Половина объявлений имеют изображения');
                } else {
                    console.log('⚠️ Нужно улучшить извлечение изображений');
                }
            } else {
                console.log('\n❌ Изображения не найдены. Проверьте логику извлечения');
            }

        } else {
            console.log('⚠️ Неожиданная структура ответа');
        }

    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);
    }
}

testSrcsetExtraction().catch(console.error);