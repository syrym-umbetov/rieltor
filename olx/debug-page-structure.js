// debug-page-structure.js - Отладка структуры страницы OLX
const https = require('https');

const TEST_URL = 'https://olx.kz/d/obyavlenie/dvuhkomnatnaya-kvartira-IDqgDUJ.html';

async function debugPageStructure() {
    console.log('🔍 Отладка структуры страницы OLX...');
    console.log('URL:', TEST_URL);

    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache'
        };

        console.log('📡 Отправляем запрос к OLX...');
        const response = await fetch(TEST_URL, { headers });

        console.log('📊 Статус ответа:', response.status, response.statusText);
        console.log('📋 Заголовки ответа:');
        for (const [key, value] of response.headers.entries()) {
            console.log(`  ${key}: ${value}`);
        }

        if (!response.ok) {
            console.error('❌ Ошибка HTTP:', response.status);
            return;
        }

        const html = await response.text();
        console.log('\n📄 Информация о HTML:');
        console.log('  Размер:', html.length, 'символов');
        console.log('  Содержит title?', html.includes('<title>'));
        console.log('  Содержит JSON-LD?', html.includes('application/ld+json'));

        // Ищем заголовки страницы
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
            console.log('  Title страницы:', titleMatch[1]);
        }

        // Проверяем селекторы для заголовка
        const h1Patterns = [
            /data-cy="ad_title"[^>]*>([^<]+)</,
            /h1[^>]*data-cy="ad_title"[^>]*>([^<]+)<\/h1>/,
            /<h1[^>]*>([^<]+)<\/h1>/,
            /h4[^>]*data-cy="ad_title"[^>]*>([^<]+)<\/h4>/
        ];

        console.log('\n🔍 Поиск заголовков объявления:');
        h1Patterns.forEach((pattern, index) => {
            const match = html.match(pattern);
            if (match) {
                console.log(`  Паттерн ${index + 1}: "${match[1]}"`);
            }
        });

        // Проверяем селекторы для цены
        const pricePatterns = [
            /data-testid="ad-price"[^>]*>([^<]+)</,
            /class="[^"]*price[^"]*"[^>]*>([^<]+)</,
            /тг\./g
        ];

        console.log('\n💰 Поиск цены:');
        pricePatterns.forEach((pattern, index) => {
            const matches = html.match(pattern);
            if (matches) {
                console.log(`  Паттерн ${index + 1}:`, matches.slice(0, 3));
            }
        });

        // Ищем местоположение
        const locationPatterns = [
            /data-testid="location-date"[^>]*>([^<]+)</,
            /Алматы[^<]*/g
        ];

        console.log('\n📍 Поиск местоположения:');
        locationPatterns.forEach((pattern, index) => {
            const matches = html.match(pattern);
            if (matches) {
                console.log(`  Паттерн ${index + 1}:`, matches.slice(0, 3));
            }
        });

        // Проверяем если страница заблокирована или показывает капчу
        if (html.includes('captcha') || html.includes('Captcha') || html.includes('robot')) {
            console.log('\n🚫 ВНИМАНИЕ: Страница может содержать капчу или блокировку ботов');
        }

        if (html.includes('Nie znaleziono') || html.includes('Not found') || html.includes('404')) {
            console.log('\n❌ ВНИМАНИЕ: Объявление не найдено (404)');
        }

        // Сохраняем HTML для анализа
        const fs = require('fs');
        fs.writeFileSync('./debug-page.html', html);
        console.log('\n💾 HTML сохранен в debug-page.html для анализа');

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

debugPageStructure();