// test-json-ld-images.js - Тест улучшенного извлечения изображений из JSON-LD
async function testJsonLdImages() {
    console.log('🔥 Тест улучшенного извлечения изображений из JSON-LD\n');

    // Ждем 30 секунд для обхода rate limiting
    console.log('⏳ Ожидание 30 секунд...');
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
            const multipleImages = properties.filter(p => p.images.length > 1);
            const highQualityImages = properties.filter(p =>
                p.images.length > 0 &&
                (p.images[0].includes('800x') || p.images[0].includes('600x') || p.images[0].includes('510x'))
            );

            console.log('\n📊 Статистика изображений:');
            console.log(`   🖼️ Объявлений с изображениями: ${withImages.length}/${properties.length} (${Math.round((withImages.length / properties.length) * 100)}%)`);
            console.log(`   🎭 С несколькими изображениями: ${multipleImages.length}/${withImages.length}`);
            console.log(`   ✨ С высоким качеством: ${highQualityImages.length}/${withImages.length}`);

            // Детальный анализ первых 5 объявлений
            console.log('\n🔍 Детальный анализ изображений:');
            properties.slice(0, 5).forEach((property, index) => {
                console.log(`\n${index + 1}. ${property.title.substring(0, 50)}...`);
                console.log(`   💰 ${property.price}`);
                console.log(`   📍 ${property.location}`);
                console.log(`   🔗 ${property.url}`);
                console.log(`   🆔 ID: ${property.propertyId}`);

                if (property.images.length > 0) {
                    console.log(`   🖼️ Изображений: ${property.images.length}`);
                    property.images.forEach((img, imgIndex) => {
                        console.log(`     ${imgIndex + 1}. ${img}`);

                        // Анализ качества
                        if (img.includes('800x') || img.includes('600x')) {
                            console.log(`       ✅ Высокое качество`);
                        } else if (img.includes('510x')) {
                            console.log(`       👍 Хорошее качество`);
                        } else if (img.includes('216x') || img.includes('150x')) {
                            console.log(`       ⚠️ Низкое качество`);
                        } else {
                            console.log(`       ❓ Неизвестное качество`);
                        }
                    });
                } else {
                    console.log(`   ❌ Нет изображений`);
                }
            });

            // Общая оценка качества
            const imageScore = Math.round((withImages.length / properties.length) * 100);
            console.log(`\n📈 Оценка качества извлечения изображений: ${imageScore}%`);

            if (imageScore >= 80) {
                console.log('🎉 Отлично! Большинство объявлений имеют изображения');
            } else if (imageScore >= 60) {
                console.log('👍 Хорошо! Более половины объявлений имеют изображения');
            } else if (imageScore >= 40) {
                console.log('🔧 Удовлетворительно, но можно улучшить');
            } else {
                console.log('⚠️ Низкое качество извлечения, нужны доработки');
            }

            // Проверка уникальности изображений
            const allImages = properties.flatMap(p => p.images);
            const uniqueImages = new Set(allImages);
            console.log(`\n🎯 Уникальные изображения: ${uniqueImages.size} из ${allImages.length} (${Math.round((uniqueImages.size / allImages.length) * 100)}% уникальных)`);

        } else {
            console.log('⚠️ Неожиданная структура ответа');
        }

    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);
    }
}

testJsonLdImages().catch(console.error);