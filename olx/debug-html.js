// debug-html.js - Отладка HTML структуры OLX
const { JSDOM } = require('jsdom');

async function debugOlxHtml() {
    console.log('🔍 Анализируем HTML структуру страницы поиска OLX\n');

    const searchUrl = 'https://www.olx.kz/nedvizhimost/prodazha-kvartiry/alma-ata';

    try {
        console.log('📡 Загружаем страницу:', searchUrl);

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            console.error(`❌ Ошибка: ${response.status}`);
            return;
        }

        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;

        console.log('✅ HTML загружен, анализируем структуру...\n');

        // Ищем карточки объявлений
        const possibleSelectors = [
            '[data-cy="l-card"]',
            '[data-testid="l-card"]',
            '.css-1sw7q4x',
            '.listing-ad-card',
            'div[data-cy*="card"]',
            'div[data-testid*="card"]'
        ];

        let listingElements = [];
        let usedSelector = null;

        for (const selector of possibleSelectors) {
            listingElements = Array.from(document.querySelectorAll(selector));
            if (listingElements.length > 0) {
                usedSelector = selector;
                console.log(`📦 Найдены карточки с селектором: ${selector}`);
                console.log(`📊 Количество карточек: ${listingElements.length}\n`);
                break;
            }
        }

        if (listingElements.length === 0) {
            console.log('❌ Карточки объявлений не найдены');

            // Попробуем найти любые ссылки на объявления
            const links = document.querySelectorAll('a[href*="/d/obyavlenie/"]');
            console.log(`🔗 Найдено ссылок на объявления: ${links.length}`);

            if (links.length > 0) {
                console.log('📋 Первые 3 ссылки:');
                Array.from(links).slice(0, 3).forEach((link, index) => {
                    console.log(`${index + 1}. ${link.getAttribute('href')}`);
                });
            }
            return;
        }

        // Анализируем первые несколько карточек
        console.log('🔍 Анализируем структуру карточек:\n');

        listingElements.slice(0, 3).forEach((element, index) => {
            console.log(`📦 Карточка ${index + 1}:`);
            console.log('HTML:', element.outerHTML.substring(0, 500) + '...\n');

            // Ищем изображения
            const images = element.querySelectorAll('img');
            console.log(`🖼️ Найдено img элементов: ${images.length}`);

            images.forEach((img, imgIndex) => {
                console.log(`  Изображение ${imgIndex + 1}:`);
                console.log(`    src: ${img.getAttribute('src')}`);
                console.log(`    data-src: ${img.getAttribute('data-src')}`);
                console.log(`    data-srcset: ${img.getAttribute('data-srcset')}`);
                console.log(`    srcset: ${img.getAttribute('srcset')}`);
                console.log(`    class: ${img.getAttribute('class')}`);
                console.log(`    style: ${img.getAttribute('style')}`);
            });

            // Ищем фоновые изображения
            const divsWithBackground = element.querySelectorAll('div[style*="background"]');
            if (divsWithBackground.length > 0) {
                console.log(`🎨 Найдено div с background: ${divsWithBackground.length}`);
                divsWithBackground.forEach((div, divIndex) => {
                    console.log(`  Div ${divIndex + 1}: ${div.getAttribute('style')}`);
                });
            }

            console.log('─'.repeat(80));
        });

        // Проверяем JSON-LD данные
        console.log('\n📄 Проверяем JSON-LD данные:');
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        console.log(`📊 Найдено JSON-LD скриптов: ${scripts.length}`);

        scripts.forEach((script, index) => {
            try {
                const data = JSON.parse(script.textContent);
                if (data['@type'] === 'ItemList' && data.itemListElement) {
                    console.log(`✅ JSON-LD ${index + 1}: ItemList с ${data.itemListElement.length} элементами`);

                    // Проверяем первый элемент на наличие изображений
                    if (data.itemListElement[0] && data.itemListElement[0].item) {
                        const item = data.itemListElement[0].item;
                        console.log(`🖼️ Изображения в JSON-LD: ${item.image ? (Array.isArray(item.image) ? item.image.length : 1) : 0}`);
                        if (item.image) {
                            const images = Array.isArray(item.image) ? item.image : [item.image];
                            console.log(`📸 Примеры URL: ${images.slice(0, 2).join(', ')}`);
                        }
                    }
                } else {
                    console.log(`ℹ️ JSON-LD ${index + 1}: ${data['@type'] || 'неизвестный тип'}`);
                }
            } catch (error) {
                console.log(`❌ JSON-LD ${index + 1}: ошибка парсинга`);
            }
        });

    } catch (error) {
        console.error('❌ Ошибка анализа:', error.message);
    }
}

debugOlxHtml().catch(console.error);