// extract-from-html.js - Извлечение URLs из предоставленного HTML
const fs = require('fs');

// HTML контент с вашей страницы поиска OLX
const htmlContent = `<div data-testid="listing-grid" class="css-j0t2x2"><div id="div-gpt-ad-listing-sponsored-ad-first" class="baxter-container" data-testid="qa-advert-slot"><div id="div-gpt-ad-listing-sponsored-ad-first-inner" class="baxter-inner baxter--1948304045" data-google-query-id="CIXyzuqJ348DFZYLogMdfbw6yw" style="display: none;"><div id="google_ads_iframe_/55937117/OLX_KZ_Desktop/Listing/native_1_0__container__" style="border: 0pt none;"></div></div></div><div data-cy="l-card" data-testid="l-card" data-visually-ready-trigger-element="true" id="388151417" class="css-1sw7q4x"><div class="css-1r93q13"><div type="list" class="css-1g5933j"><div type="list" class="css-1ut25fa"><a class="css-1tqlkj0" href="/d/obyavlenie/dvuhkomnatnaya-kvartira-IDqgDUJ.html"><div type="list" class="css-11ow61k"><div class="css-gl6djm"><img src="https://frankfurt.apollo.olxcdn.com:443/v1/files/2rkkissjh7t03-KZ/image;s=216x152;q=50" srcset="https://frankfurt.apollo.olxcdn.com:443/v1/files/2rkkissjh7t03-KZ/image;s=150x200;q=50 150w, https://frankfurt.apollo.olxcdn.com:443/v1/files/2rkkissjh7t03-KZ/image;s=200x267;q=50 200w, https://frankfurt.apollo.olxcdn.com:443/v1/files/2rkkissjh7t03-KZ/image;s=270x360;q=50 300w, https://frankfurt.apollo.olxcdn.com:443/v1/files/2rkkissjh7t03-KZ/image;s=360x480;q=50 400w, https://frankfurt.apollo.olxcdn.com:443/v1/files/2rkkissjh7t03-KZ/image;s=510x680;q=50 600w" sizes="216px" alt="Двухкомнатная квартира" class="css-8wsg1m"></div></div><div class="css-13aawz3"><div class="css-1av34ht"><div class="css-3xiokn"><div class="css-10iz5lf"><div class="css-144z9p2">ТОП</div></div></div></div></div></a></div><div type="list" class="css-1apmciz"><div data-cy="ad-card-title" class="css-u2ayx9"><a class="css-1tqlkj0" href="/d/obyavlenie/dvuhkomnatnaya-kvartira-IDqgDUJ.html"><h4 class="css-hzlye5">Двухкомнатная квартира</h4></a><p data-testid="ad-price" class="css-blr5zl">25 000 000 тг.<span class="css-1ygi0zw"></span></p></div><div class="css-krg4hw"><span></span><div data-testid="slot-wrapper" class="css-qeocs5"></div></div><div class="css-odp1qd"><p data-testid="location-date" class="css-1b24pxk">Алматы, Жетысуский район - 16 сентября 2025 г.</p><div color="text-global-secondary" class="css-1kfqt7f"></div></div><button type="button" data-testid="adAddToFavorites" aria-pressed="false" aria-label="Подписаться" class="css-19rkjrn"><div class="css-1vcfmyf"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" class="css-py8enh"><path fill="currentColor" fill-rule="evenodd" d="M20.219 10.367 12 20.419 3.806 10.4A3.96 3.96 0 0 1 3 8c0-2.206 1.795-4 4-4a4.004 4.004 0 0 1 3.868 3h2.264A4.003 4.003 0 0 1 17 4c2.206 0 4 1.794 4 4 0 .868-.279 1.698-.781 2.367M17 2a5.999 5.999 0 0 0-5 2.686A5.999 5.999 0 0 0 7 2C3.692 2 1 4.691 1 8a5.97 5.97 0 0 0 1.232 3.633L10.71 22h2.582l8.501-10.399A5.943 5.943 0 0 0 23 8c0-3.309-2.692-6-6"></path></svg><div data-testid="favorite-icon" class="css-185v2wv">Подписаться</div></div></button></div></div></div></div><div data-cy="l-card" data-testid="l-card" data-visually-ready-trigger-element="true" id="364148929" class="css-1sw7q4x"><div class="css-1r93q13"><div type="list" class="css-1g5933j"><div type="list" class="css-1ut25fa"><a class="css-1tqlkj0" href="/d/obyavlenie/prodam-kvartiru-v-kapchagae-IDoDWLP.html">`;

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

// Извлекаем URLs
const urls = extractUrls(htmlContent);

console.log(`🔍 Найдено ${urls.length} уникальных URL объявлений:`);

// Показываем все найденные URL
urls.forEach((url, index) => {
    console.log(`${index + 1}. ${url}`);
});

// Сохраняем URL в файл
if (urls.length > 0) {
    const urlsContent = `# URL объявлений OLX, извлеченные автоматически из HTML
# Дата: ${new Date().toISOString()}
# Всего URL: ${urls.length}

${urls.join('\n')}
`;

    fs.writeFileSync('./urls.txt', urlsContent);
    console.log(`\n✅ URL сохранены в urls.txt для тестирования парсера`);
    console.log(`📋 Теперь можно запустить: node scripts/safe-parser.js`);
} else {
    console.log('❌ URL не найдены в HTML');
}