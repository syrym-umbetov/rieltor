// extract-urls.js - Извлечение URL из HTML страницы поиска OLX
const fs = require('fs');

// HTML контент с вашей страницы поиска
const htmlContent = `
${process.argv[2] || ''}
`;

// Функция для извлечения URLs из HTML
function extractUrls(html) {
    const urls = [];
    const baseUrl = 'https://olx.kz';

    // Регулярное выражение для поиска ссылок на объявления
    const linkPattern = /href="(\/d\/obyavlenie\/[^"]+)"/g;

    let match;
    while ((match = linkPattern.exec(html)) !== null) {
        const relativeUrl = match[1];
        const fullUrl = baseUrl + relativeUrl;

        // Избегаем дубликатов
        if (!urls.includes(fullUrl)) {
            urls.push(fullUrl);
        }
    }

    return urls;
}

// Если HTML передан как аргумент
if (process.argv[2]) {
    const urls = extractUrls(process.argv[2]);

    console.log(`Найдено ${urls.length} уникальных URL объявлений:`);

    // Показываем первые 10 URL
    urls.slice(0, 10).forEach((url, index) => {
        console.log(`${index + 1}. ${url}`);
    });

    if (urls.length > 10) {
        console.log(`... и еще ${urls.length - 10} URL`);
    }

    // Сохраняем URL в файл
    if (urls.length > 0) {
        const urlsContent = `# URL объявлений OLX, извлеченные автоматически
# Дата: ${new Date().toISOString()}
# Всего URL: ${urls.length}

${urls.join('\n')}
`;

        fs.writeFileSync('./urls.txt', urlsContent);
        console.log(`\n✅ URL сохранены в urls.txt`);
    }
} else {
    console.log('Использование: node extract-urls.js "HTML_CONTENT"');
    console.log('\nИли скопируйте и вставьте HTML в скрипт.');
}

// Альтернативный способ - если HTML встроен в скрипт
function extractFromEmbeddedHtml() {
    const embeddedHtml = `<div data-testid="listing-grid" class="css-j0t2x2"><div id="div-gpt-ad-listing-sponsored-ad-first" class="baxter-container" data-testid="qa-advert-slot"><div id="div-gpt-ad-listing-sponsored-ad-first-inner" class="baxter-inner baxter--1948304045" data-google-query-id="CIXyzuqJ348DFZYLogMdfbw6yw" style="display: none;"><div id="google_ads_iframe_/55937117/OLX_KZ_Desktop/Listing/native_1_0__container__" style="border: 0pt none;"></div></div></div><div data-cy="l-card" data-testid="l-card" data-visually-ready-trigger-element="true" id="388151417" class="css-1sw7q4x"><div class="css-1r93q13"><div type="list" class="css-1g5933j"><div type="list" class="css-1ut25fa"><a class="css-1tqlkj0" href="/d/obyavlenie/dvuhkomnatnaya-kvartira-IDqgDUJ.html">`;

    const urls = extractUrls(embeddedHtml);
    return urls;
}

module.exports = { extractUrls };