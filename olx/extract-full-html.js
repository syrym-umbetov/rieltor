// extract-full-html.js - Извлечение всех URLs из полного HTML
const fs = require('fs');

const fullHtml = `
<div data-testid="listing-grid" class="css-j0t2x2">
<div data-cy="l-card" data-testid="l-card" data-visually-ready-trigger-element="true" id="388151417" class="css-1sw7q4x">
<a class="css-1tqlkj0" href="/d/obyavlenie/dvuhkomnatnaya-kvartira-IDqgDUJ.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/prodam-kvartiru-v-kapchagae-IDoDWLP.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/mikrorayon-bostandykskiy-zhk-askar-tau-IDqg1hu.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/prodam-kvartiru-IDoQSJJ.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/ryskulova-emtsova-1-komnatnaya-kokoray-IDqgyrE.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/prodaetsya-2-komnat-kvartira-ryskulova-emtsova-IDqbVOY.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/srochno-prodam-2-obychnoy-planirovki-kvartiru-mkr-aynabulak-1-IDqgoSM.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/prodaetsya-2-kom-kvartira-mkr-zhuldyz-2-IDq4KRD.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/dvuhkomnatnaya-kvartira-IDqbez9.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/2-komnatnaya-kvartira-66-m-v-mikrorayone-kokzhiek-d-36-IDq0kps.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/ipoteka-za-2-dnya-srochno-prodaetsya-2-komn-kv-g-almaty-IDq5PSj.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/prodam-kvartiru-IDqfvXu.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/prodam-kvartiru-IDqfudW.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/prodam-kvartiru-2h-komnatnaya-IDqeFqd.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/prodam-kvartiru-v-IDpJJB0.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/2-bolmeli-kvartira-IDqeufQ.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/prodam-2-komnatnuyu-kvartiru-IDqemxR.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/prodam-2-h-komnatnuyu-privatizionnuyu-obschezhitiyu-sayna-tole-bi-IDqekLr.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/srochno-prodam-2-obychnoy-planirovki-aynabulak-1-IDqe7ir.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/zvonit-na-votsap-IDpkYWu.html">
<a class="css-1tqlkj0" href="/d/obyavlenie/prodam-2-komn-kvartiru-gor-almaty-ryskulova-petrova-IDpQo72.html">
</div>
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

// Извлекаем URLs
const urls = extractUrls(fullHtml);

console.log(`🔍 Найдено ${urls.length} уникальных URL объявлений:`);

// Показываем все найденные URL
urls.forEach((url, index) => {
    console.log(`${index + 1}. ${url}`);
});

// Сохраняем URL в файл
if (urls.length > 0) {
    // Берем только первые 10 URL для тестирования
    const testUrls = urls.slice(0, 10);

    const urlsContent = `# URL объявлений OLX для тестирования парсера
# Дата: ${new Date().toISOString()}
# Всего URL: ${testUrls.length} (из ${urls.length} найденных)

${testUrls.join('\n')}
`;

    fs.writeFileSync('./urls.txt', urlsContent);
    console.log(`\n✅ ${testUrls.length} URL сохранены в urls.txt для тестирования`);
    console.log(`📋 Можно запустить парсер: node scripts/safe-parser.js`);
} else {
    console.log('❌ URL не найдены');
}