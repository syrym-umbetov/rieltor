// app/api/parse-olx/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { requestTracker, measureTime } from '../../lib/request-tracker';

interface PropertyData {
  title: string;
  price: string;
  pricePerMeter?: string;
  city: string;
  district: string;
  area: string;
  rooms: string;
  floor?: string;
  buildingType?: string;
  yearBuilt?: string;
  description: string;
  features: string[];
  location: string;
  contact?: {
    name: string;
    phone?: string;
    type: string;
  };
  views?: string;
  postedDate?: string;
  images: string[];
  coordinates?: string;
  propertyId?: string;
}

function extractPropertyId(url: string): string | null {
  console.log('🔍 Извлекаем ID объявления из URL:', url);

  const patterns = [
    /\/d\/([a-z0-9-]+)\/(\d+)/,
    /ID(\d+)/i,
    /\/(\d{8,})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const id = match[2] || match[1];
      console.log('✅ Найден ID объявления:', id);
      return id;
    }
  }

  console.log('❌ ID объявления не найден в URL');
  return null;
}

function parseImages($: cheerio.CheerioAPI): string[] {
  const images: string[] = [];
  const imageUrls = new Set<string>();

  console.log('🖼️ Начинаем парсинг изображений OLX...');

  // Сначала ищем изображения в JSON-LD данных (приоритет)
  $('script[type="application/ld+json"]').each((i, element) => {
    try {
      const jsonData = JSON.parse($(element).html() || '{}');
      if (jsonData.image) {
        if (Array.isArray(jsonData.image)) {
          jsonData.image.forEach((img: any) => {
            if (typeof img === 'string') {
              imageUrls.add(img);
              console.log(`📸 Изображение из JSON-LD: ${img}`);
            } else if (img.url) {
              imageUrls.add(img.url);
              console.log(`📸 Изображение из JSON-LD: ${img.url}`);
            }
          });
        } else if (typeof jsonData.image === 'string') {
          imageUrls.add(jsonData.image);
          console.log(`📸 Изображение из JSON-LD: ${jsonData.image}`);
        }
      }
    } catch (error) {
      // Игнорируем ошибки парсинга JSON
    }
  });

  // Если изображения не найдены в JSON-LD, ищем в HTML
  if (imageUrls.size === 0) {
    console.log('🔍 Изображения не найдены в JSON-LD, ищем в HTML...');

    const selectors = [
      '.swiper-slide img',
      '.gallery-item img',
      '.photo-gallery img',
      'img[data-src*="apollo"]',
      'img[src*="apollo"]',
      '.css-gl6djm img',
      '.css-1bmvjcs img',
      '[data-testid="swiper-container"] img'
    ];

    selectors.forEach(selector => {
      $(selector).each((i, element) => {
        let src = $(element).attr('src') ||
                  $(element).attr('data-src') ||
                  $(element).attr('data-lazy-src');

        if (!src && $(element).attr('srcset')) {
          const srcset = $(element).attr('srcset') || '';
          src = srcset.split(',')[0].trim().split(' ')[0];
        }

        if (src && (src.includes('apollo') || src.includes('img.olx') || src.includes('olxcdn'))) {
          const fullSrc = src.startsWith('http') ? src : `https:${src}`;
          const fullSizeUrl = fullSrc.replace(/;s=\d+x\d+/, ';s=2048x2048')
                                    .replace(/_\d+x\d+\./, '_2048x2048.');
          imageUrls.add(fullSizeUrl);
          console.log(`📸 Найдено изображение в HTML: ${fullSizeUrl}`);
        }
      });
    });
  }

  Array.from(imageUrls).forEach(url => {
    if (!images.includes(url)) {
      images.push(url);
    }
  });

  console.log(`✅ Найдено ${images.length} изображений`);
  return images;
}

function parseLocation($: cheerio.CheerioAPI): { city: string, district: string, location: string } {
  console.log('📍 Парсим местоположение...');

  let city = '';
  let district = '';
  let location = '';

  // Сначала пробуем JSON-LD
  $('script[type="application/ld+json"]').each((i, element) => {
    try {
      const jsonData = JSON.parse($(element).html() || '{}');
      if (jsonData.offers && jsonData.offers.areaServed && jsonData.offers.areaServed.name) {
        district = jsonData.offers.areaServed.name;
        console.log(`📍 Район из JSON-LD: ${district}`);
      }
    } catch (error) {
      // Игнорируем ошибки парсинга JSON
    }
  });

  // Ищем в мета-тегах
  const description = $('meta[name="description"]').attr('content') || '';
  if (description.includes('Алматы')) {
    city = 'Алматы';
  }

  // Ищем в breadcrumbs
  $('[data-testid="breadcrumbs"] a').each((i, element) => {
    const text = $(element).text().trim();
    if (text.includes('Алматы')) {
      city = 'Алматы';
    }
    if (text.includes('район')) {
      district = text;
    }
  });

  // Формируем location
  if (city && district) {
    location = `${city}, ${district}`;
  } else if (city) {
    location = city;
  } else if (district) {
    location = district;
  }

  console.log(`📍 Местоположение: город=${city}, район=${district}, полное=${location}`);
  return { city, district, location };
}

function parseContactInfo($: cheerio.CheerioAPI): { name: string; phone?: string; type: string } | undefined {
  console.log('📞 Парсим контактную информацию...');

  const contactSelectors = [
    '[data-testid="contact-box"]',
    '.css-1kfqt7f', // блок с контактами
    '.seller-info',
    '.user-other-ads'
  ];

  for (const selector of contactSelectors) {
    const contactBlock = $(selector);
    if (contactBlock.length > 0) {
      const name = contactBlock.find('h4, .css-1kfqt7f h4, strong').first().text().trim();

      if (name) {
        return {
          name,
          type: 'Частное лицо', // OLX в основном частные лица
        };
      }
    }
  }

  return undefined;
}

function parsePrice($: cheerio.CheerioAPI): { price: string; pricePerMeter?: string } {
  console.log('💰 Парсим цену...');

  let price = '';
  let pricePerMeter = '';

  // Ищем цену в различных селекторах
  const priceSelectors = [
    'h3[data-testid="ad-price-container"]',
    '.css-12vqlj3', // основная цена
    '.css-90xrc0',
    '[data-testid="ad-price"]'
  ];

  for (const selector of priceSelectors) {
    const priceText = $(selector).text().trim();
    if (priceText && priceText.length > 0) {
      price = priceText.replace(/\s+/g, ' ');
      console.log(`💰 Цена найдена: ${price}`);
      break;
    }
  }

  return { price, pricePerMeter };
}

export async function POST(request: NextRequest) {
  const timer = measureTime();
  const startTime = new Date().toISOString();
  let requestUrl = '';

  try {
    const { url } = await request.json();
    requestUrl = url;

    if (!url || !url.includes('olx.')) {
      await requestTracker.logRequest({
        timestamp: startTime,
        url: url || 'empty',
        success: false,
        statusCode: 400,
        errorMessage: 'Неверная ссылка на OLX'
      });

      return NextResponse.json(
        { error: 'Неверная ссылка на OLX' },
        { status: 400 }
      );
    }

    // Rate limiting отключен для тестирования

    console.log(`[${startTime}] Парсинг OLX URL: ${url}`);

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache'
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
      await requestTracker.logRequest({
        timestamp: startTime,
        url,
        success: false,
        statusCode: response.status,
        errorMessage: `HTTP error! status: ${response.status}`,
        responseTime: timer()
      });

      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Инициализируем объект данных
    const propertyData: PropertyData = {
      title: '',
      price: '',
      city: '',
      district: '',
      area: '',
      rooms: '',
      description: '',
      features: [],
      location: '',
      images: [],
      propertyId: extractPropertyId(url) || undefined
    };

    // Парсим JSON-LD данные (приоритет)
    let jsonLdData: any = null;
    $('script[type="application/ld+json"]').each((i, element) => {
      try {
        const data = JSON.parse($(element).html() || '{}');
        if (data['@type'] === 'Product' && data.name) {
          jsonLdData = data;
          console.log('📊 Найдены JSON-LD данные');
        }
      } catch (error) {
        // Игнорируем ошибки парсинга JSON
      }
    });

    // Заголовок объявления (приоритет JSON-LD)
    propertyData.title = jsonLdData?.name ||
                         $('h1[data-cy="ad_title"], h4[data-cy="ad_title"]').text().trim() ||
                         $('h1').text().trim() ||
                         $('title').text().split(' - ')[0].trim();

    // Цена (приоритет JSON-LD)
    if (jsonLdData?.offers?.price) {
      propertyData.price = `${jsonLdData.offers.price.toLocaleString()} тг.`;
    } else {
      const priceData = parsePrice($);
      propertyData.price = priceData.price;
      propertyData.pricePerMeter = priceData.pricePerMeter;
    }

    // Местоположение
    const locationData = parseLocation($);
    propertyData.city = locationData.city;
    propertyData.district = locationData.district;
    propertyData.location = locationData.location;

    // Описание (приоритет JSON-LD)
    propertyData.description = jsonLdData?.description ||
                               $('[data-cy="ad_description"] div, .css-g5mtvm-Text').text().trim() ||
                               $('meta[name="description"]').attr('content') || '';

    // Характеристики из таблицы
    $('p.css-b5m1rv').each((i, element) => {
      const key = $(element).text().trim().toLowerCase();
      const valueElement = $(element).next('p.css-1juynto');
      const value = valueElement.text().trim();

      if (key.includes('площадь') && value) {
        propertyData.area = value;
      } else if (key.includes('количество комнат') && value) {
        propertyData.rooms = value;
      } else if (key.includes('этаж') && value) {
        propertyData.floor = value;
      } else if (key.includes('тип здания') && value) {
        propertyData.buildingType = value;
      } else if (key.includes('год постройки') && value) {
        propertyData.yearBuilt = value;
      } else if (value) {
        propertyData.features.push(`${key}: ${value}`);
      }
    });

    // Если не нашли комнаты в характеристиках, ищем в заголовке
    if (!propertyData.rooms) {
      const roomsMatch = propertyData.title.match(/(\d+)-комнатная|(\d+)-к|(\d+)\s*комн/i);
      if (roomsMatch) {
        const roomCount = roomsMatch[1] || roomsMatch[2] || roomsMatch[3];
        propertyData.rooms = `${roomCount} комн.`;
      }
    }

    // Если не нашли площадь в характеристиках, ищем в заголовке
    if (!propertyData.area) {
      const areaMatch = propertyData.title.match(/(\d+(?:\.\d+)?)\s*м²/);
      if (areaMatch) {
        propertyData.area = `${areaMatch[1]} м²`;
      }
    }

    // Изображения
    propertyData.images = parseImages($);

    // Контактная информация
    propertyData.contact = parseContactInfo($);

    // Дата размещения
    $('span.css-19yf5ek').each((i, element) => {
      const text = $(element).text().trim();
      if (text.includes('Размещено') || text.includes('Добавлено')) {
        propertyData.postedDate = text;
      }
    });

    // Количество просмотров
    const viewsText = $('.css-9b8r2c').text().trim();
    if (viewsText.includes('просмотр')) {
      propertyData.views = viewsText;
    }

    // Проверка основных данных
    if (!propertyData.title && !propertyData.price) {
      await requestTracker.logRequest({
        timestamp: startTime,
        url,
        success: false,
        statusCode: 422,
        errorMessage: 'Не удалось извлечь данные из объявления OLX',
        responseTime: timer()
      });

      return NextResponse.json(
        { error: 'Не удалось извлечь данные из объявления. Возможно, изменилась структура страницы или объявление удалено.' },
        { status: 422 }
      );
    }

    // Очистка данных
    Object.keys(propertyData).forEach(key => {
      if (typeof (propertyData as any)[key] === 'string') {
        (propertyData as any)[key] = (propertyData as any)[key].replace(/\s+/g, ' ').trim();
      }
    });

    const responseTime = timer();

    await requestTracker.logRequest({
      timestamp: startTime,
      url,
      success: true,
      statusCode: 200,
      responseTime
    });

    const stats = await requestTracker.getStats();
    console.log(`✅ Парсинг OLX завершен. Статистика:`, {
      totalRequests: stats.totalRequests,
      successRate: ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) + '%',
      requestsToday: stats.requestsToday,
      averageResponseTime: stats.averageResponseTime?.toFixed(0) + 'ms'
    });

    return NextResponse.json({
      data: propertyData,
      _stats: {
        responseTime,
        requestsToday: stats.requestsToday,
        totalRequests: stats.totalRequests
      }
    });

  } catch (error) {
    const responseTime = timer();

    await requestTracker.logRequest({
      timestamp: startTime,
      url: requestUrl,
      success: false,
      statusCode: 500,
      errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка',
      responseTime
    });

    console.error('Ошибка парсинга OLX:', error);

    return NextResponse.json(
      {
        error: 'Ошибка при парсинге объявления OLX. Проверьте ссылку и попробуйте позже.',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}

// GET метод для тестирования
export async function GET() {
  return NextResponse.json({
    message: 'OLX Parser API готов к работе',
    usage: 'POST /api/parse-olx with { url: "https://olx.kz/..." }',
    version: '1.0.0'
  });
}