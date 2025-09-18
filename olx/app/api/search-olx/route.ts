import { NextRequest, NextResponse } from 'next/server';
import { requestTracker, measureTime } from '../../lib/request-tracker';
import { JSDOM } from 'jsdom';

interface SearchFilters {
  priceMin?: string;
  priceMax?: string;
  areaMin?: string;
  areaMax?: string;
  rooms?: string;
  city?: string;
  page?: number;
}

interface PropertyItem {
  title: string;
  price: string;
  location: string;
  area?: string;
  rooms?: string;
  images: string[];
  url: string;
  propertyId?: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0'
];

function processOlxImageUrl(imageUrl: string): string {
  // Обрабатываем относительные пути
  if (imageUrl.startsWith('/')) {
    imageUrl = 'https://www.olx.kz' + imageUrl;
  }

  // Убираем параметры размера и качества из OLX CDN URL
  if (imageUrl.includes('frankfurt.apollo.olxcdn.com')) {
    // Убираем все параметры ;s=... и ;q=...
    let cleanUrl = imageUrl.replace(/;s=[^;]*/, '').replace(/;q=[^;]*/, '');

    // Убираем лишние точки с запятой
    cleanUrl = cleanUrl.replace(/;+$/, '');

    // Добавляем параметры для нормального размера изображения
    return cleanUrl + ';s=800x600;q=80';
  }

  return imageUrl;
}

function findBestImageUrl(element: Element): string | null {
  // Ищем все изображения в элементе
  const images = element.querySelectorAll('img');

  for (const img of images) {
    // Сначала проверяем srcset - самый надежный источник
    const srcset = img.getAttribute('srcset');
    if (srcset && srcset.includes('olxcdn.com')) {
      const urls = srcset.split(',');
      // Берем последний URL (самое большое изображение)
      const lastUrl = urls[urls.length - 1].trim().split(' ')[0];
      return lastUrl;
    }

    // Проверяем обычный src
    const src = img.getAttribute('src');
    if (src && src.includes('olxcdn.com')) {
      return src;
    }

    // Проверяем другие атрибуты
    const attributes = ['data-src', 'data-original', 'data-lazy-src', 'data-srcset'];
    for (const attr of attributes) {
      const value = img.getAttribute(attr);
      if (value && value.includes('olxcdn.com')) {
        return value;
      }
    }
  }

  return null;
}

function extractImagesFromJsonLd(document: Document): Map<string, string[]> {
  const imageMap = new Map<string, string[]>();

  // Ищем все JSON-LD скрипты
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '');

      // Проверяем Product структуру с offers
      if (data['@type'] === 'Product' && data.offers && data.offers.offers) {
        for (const offer of data.offers.offers) {
          if (offer.url && offer.image) {
            // Извлекаем ID из URL объявления
            const urlMatch = offer.url.match(/ID([a-zA-Z0-9]+)\.html/);
            if (urlMatch) {
              const adId = urlMatch[1];
              const images = Array.isArray(offer.image) ? offer.image : [offer.image];
              // Обрабатываем изображения, добавляя параметры качества
              const processedImages = images.map((img: string) => processOlxImageUrl(img));
              imageMap.set(adId, processedImages);
            }
          }
        }
      }

      // Проверяем ItemList структуру
      if (data['@type'] === 'ItemList' && data.itemListElement) {
        for (const item of data.itemListElement) {
          if (item.item && item.item.url && item.item.image) {
            const urlMatch = item.item.url.match(/ID([a-zA-Z0-9]+)\.html/);
            if (urlMatch) {
              const adId = urlMatch[1];
              const images = Array.isArray(item.item.image) ? item.item.image : [item.item.image];
              const processedImages = images.map((img: string) => processOlxImageUrl(img));
              imageMap.set(adId, processedImages);
            }
          }
        }
      }
    } catch (error) {
      // Игнорируем ошибки парсинга JSON-LD
      continue;
    }
  }

  return imageMap;
}

function extractPaginationInfo(document: Document, requestedPage: number = 1): { totalPages: number; currentPage: number } {
  try {
    // Ищем пагинацию в HTML
    const paginationWrapper = document.querySelector('[data-testid="pagination-wrapper"], [data-cy="pagination"]');

    if (!paginationWrapper) {
      return { totalPages: 1, currentPage: 1 };
    }

    // Ищем все ссылки на страницы
    const pageLinks = paginationWrapper.querySelectorAll('[data-testid^="pagination-link-"]');
    let maxPage = 1;
    let currentPage = 1;

    // Находим максимальный номер страницы из ссылок
    pageLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        const pageMatch = href.match(/page=(\d+)/);
        if (pageMatch) {
          const pageNum = parseInt(pageMatch[1]);
          if (pageNum > maxPage) {
            maxPage = pageNum;
          }
        }
      }

      // Проверяем текст ссылки на номер страницы
      const linkText = link.textContent?.trim();
      if (linkText && /^\d+$/.test(linkText)) {
        const pageNum = parseInt(linkText);
        if (pageNum > maxPage) {
          maxPage = pageNum;
        }
      }
    });

    // Используем запрошенную страницу как текущую, но можем проверить активную в HTML
    currentPage = requestedPage;

    // Попытаемся найти активную страницу в HTML для дополнительной проверки
    const activePage = paginationWrapper.querySelector('.pagination-item__active, [class*="active"]');
    if (activePage) {
      const activeText = activePage.textContent?.trim();
      if (activeText && /^\d+$/.test(activeText)) {
        const activPageNum = parseInt(activeText);
        // Если HTML показывает другую активную страницу, используем её
        if (activPageNum !== requestedPage) {
          console.log(`⚠️ Несоответствие: запрошена страница ${requestedPage}, но HTML показывает активную ${activPageNum}`);
        }
      }
    }

    console.log(`📄 Пагинация: текущая страница ${currentPage}, всего страниц ${maxPage}`);

    return { totalPages: maxPage, currentPage };
  } catch (error) {
    console.error('Ошибка парсинга пагинации:', error);
    return { totalPages: 1, currentPage: 1 };
  }
}

function buildSearchUrl(filters: SearchFilters): string {
  const baseUrl = 'https://www.olx.kz/nedvizhimost/prodazha-kvartiry';

  // Карта городов для OLX URL
  const cityMap: { [key: string]: string } = {
    'almaty': 'alma-ata',
    'astana': 'nur-sultan',
    'shymkent': 'shymkent',
    'aktobe': 'aktobe',
    'taraz': 'taraz'
  };

  let url = baseUrl;

  if (filters.city && cityMap[filters.city]) {
    url += `/${cityMap[filters.city]}`;
  }

  const params = new URLSearchParams();

  if (filters.priceMin || filters.priceMax) {
    if (filters.priceMin) params.append('search[filter_float_price:from]', filters.priceMin);
    if (filters.priceMax) params.append('search[filter_float_price:to]', filters.priceMax);
  }

  if (filters.areaMin || filters.areaMax) {
    if (filters.areaMin) params.append('search[filter_float_total_area:from]', filters.areaMin);
    if (filters.areaMax) params.append('search[filter_float_total_area:to]', filters.areaMax);
  }

  if (filters.rooms && filters.rooms !== 'any') {
    if (filters.rooms === '4+') {
      params.append('search[filter_enum_rooms][0]', '4');
      params.append('search[filter_enum_rooms][1]', '5');
      params.append('search[filter_enum_rooms][2]', '6');
    } else {
      params.append('search[filter_enum_rooms][0]', filters.rooms);
    }
  }

  // Добавляем пагинацию
  if (filters.page && filters.page > 1) {
    params.append('page', filters.page.toString());
  }

  if (params.toString()) {
    url += '?' + params.toString();
  }

  return url;
}

async function parseSearchResults(searchUrl: string): Promise<{ properties: PropertyItem[]; paginationInfo: { totalPages: number; currentPage: number } }> {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки поисковой страницы: ${response.status}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Извлекаем данные JSON-LD для всех объявлений
  const properties: PropertyItem[] = [];

  // Сначала извлекаем карту изображений из JSON-LD
  const imageMap = extractImagesFromJsonLd(document);

  // Извлекаем информацию о пагинации
  // Определяем запрошенную страницу из URL
  const requestedPage = searchUrl.includes('page=') ?
    parseInt(searchUrl.match(/page=(\d+)/)?.[1] || '1') : 1;
  const paginationInfo = extractPaginationInfo(document, requestedPage);

  // Ищем JSON-LD данные для списка объявлений
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '{}');

      // Проверяем Product структуру с offers (из head)
      if (data['@type'] === 'Product' && data.offers && data.offers.offers) {
        for (const offer of data.offers.offers) {
          // Извлекаем ID из URL
          const urlMatch = offer.url?.match(/ID([a-zA-Z0-9]+)\.html/);
          const adId = urlMatch ? urlMatch[1] : '';

          const property: PropertyItem = {
            title: String(offer.name || 'Без названия'),
            price: offer.price ? String(`${offer.price.toLocaleString()} ${offer.priceCurrency || 'тг'}`) : 'Цена не указана',
            location: String(offer.areaServed?.name || 'Местоположение не указано'),
            images: (imageMap.get(adId) || (offer.image ? (Array.isArray(offer.image) ? offer.image.map(processOlxImageUrl) : [processOlxImageUrl(offer.image)]) : [])).map(img => String(img)),
            url: String(offer.url || ''),
            propertyId: String(adId)
          };

          properties.push(property);
        }
      }

      // Проверяем ItemList структуру (старый метод)
      if (data['@type'] === 'ItemList' && data.itemListElement) {
        for (const item of data.itemListElement) {
          if (item.item && item.item['@type'] === 'Product') {
            const product = item.item;
            const urlMatch = product.url?.match(/ID([a-zA-Z0-9]+)\.html/);
            const adId = urlMatch ? urlMatch[1] : '';

            const property: PropertyItem = {
              title: String(product.name || 'Без названия'),
              price: product.offers?.price ? String(`${product.offers.price} ${product.offers.priceCurrency || 'тг'}`) : 'Цена не указана',
              location: String(product.location?.address?.addressLocality || 'Местоположение не указано'),
              images: (imageMap.get(adId) || (product.image ? (Array.isArray(product.image) ? product.image.map(processOlxImageUrl) : [processOlxImageUrl(product.image)]) : [])).map(img => String(img)),
              url: String(product.url || ''),
              propertyId: String(adId)
            };

            // Извлекаем дополнительные характеристики
            if (product.additionalProperty) {
              for (const prop of product.additionalProperty) {
                if (prop.name === 'total_area' && prop.value) {
                  property.area = String(`${prop.value} м²`);
                }
                if (prop.name === 'rooms' && prop.value) {
                  property.rooms = String(prop.value);
                }
              }
            }

            properties.push(property);
          }
        }
      }
    } catch (error) {
      // Игнорируем ошибки парсинга JSON-LD
      continue;
    }
  }

  // Если JSON-LD не дал результатов, пробуем парсить HTML
  if (properties.length === 0) {
    console.log('🔍 JSON-LD не дал результатов, парсим HTML...');

    // Ищем различные селекторы для карточек объявлений
    const possibleSelectors = [
      '[data-cy="l-card"]',
      '[data-testid="l-card"]',
      '.css-1sw7q4x',
      '[data-cy="listing-ad-title"]',
      '.listing-ad-card'
    ];

    let listingElements: Element[] = [];
    for (const selector of possibleSelectors) {
      listingElements = Array.from(document.querySelectorAll(selector));
      if (listingElements.length > 0) {
        console.log(`✅ Найдены элементы с селектором: ${selector}, количество: ${listingElements.length}`);
        break;
      }
    }

    if (listingElements.length === 0) {
      // Пробуем альтернативные подходы
      console.log('🔍 Ищем ссылки на объявления...');
      const links = Array.from(document.querySelectorAll('a[href*="/d/obyavlenie/"]'));
      console.log(`🔗 Найдено ссылок на объявления: ${links.length}`);

      for (const link of links.slice(0, 20)) { // Ограничиваем до 20 результатов
        try {
          const href = link.getAttribute('href');
          if (!href) continue;

          const fullUrl = href.startsWith('http') ? href : `https://www.olx.kz${href}`;

          // Ищем данные в родительском элементе
          const parent = link.closest('div') || link.parentElement;
          const titleElement = parent?.querySelector('h6, h4, h3, h2') || link.querySelector('h6, h4, h3, h2');
          const priceElement = parent?.querySelector('[data-testid*="price"], .price, [class*="price"]');
          const locationElement = parent?.querySelector('[data-testid*="location"], .location, [class*="location"]');
          if (titleElement) {
            // Очищаем текст цены от CSS и лишних символов
            let priceText = priceElement?.textContent?.trim() || 'Цена не указана';
            if (priceText.includes('.css-') || priceText.includes('..css-')) {
              // Ищем цену в начале строки до CSS-классов
              const priceMatch = priceText.match(/^[^.]*тг[^.]*/);
              if (priceMatch) {
                priceText = priceMatch[0].trim();
              } else {
                // Альтернативный поиск - только числа и "тг"
                const numbersMatch = priceText.match(/[\d\s]+тг/);
                if (numbersMatch) {
                  priceText = numbersMatch[0];
                }
              }
            }

            // Извлекаем ID из URL и ищем изображения
            const adId = href.split('-').pop()?.replace('.html', '') || '';
            const jsonLdImages = imageMap.get(adId);

            let images: string[] = [];
            if (jsonLdImages && jsonLdImages.length > 0) {
              // Используем изображения из JSON-LD
              images = jsonLdImages;
            } else {
              // Ищем изображения в HTML как fallback
              const imageUrl = findBestImageUrl(parent || link);
              images = imageUrl ? [processOlxImageUrl(imageUrl)] : [];
            }

            const property: PropertyItem = {
              title: String(titleElement.textContent?.trim() || 'Без названия'),
              price: String(priceText),
              location: String(locationElement?.textContent?.trim() || 'Местоположение не указано'),
              images: Array.isArray(images) ? images.map(img => String(img)) : [],
              url: String(fullUrl),
              propertyId: String(adId)
            };

            properties.push(property);
            console.log(`📝 Добавлено объявление: ${property.title.substring(0, 50)}...`);
          }
        } catch (error) {
          continue;
        }
      }
    } else {
      // Парсим найденные элементы
      for (const element of listingElements) {
        try {
          const titleSelectors = [
            '[data-cy="ad-card-title"] h6',
            '[data-testid="ad-card-title"] h6',
            'h6',
            'h4',
            'h3',
            '.title'
          ];

          const priceSelectors = [
            '[data-cy="ad-card-price"]',
            '[data-testid="ad-card-price"]',
            'p[data-testid*="ad-price"]',
            '[class*="price"]',
            '.price',
            'p:contains("тг")',
            'span:contains("тг")',
            'div:contains("тг")'
          ];

          const locationSelectors = [
            '[data-cy="ad-card-location"]',
            '[data-testid="ad-card-location"]',
            '[data-testid*="location"]',
            '.location',
            '[class*="location"]',
            'p:contains("район")',
            'span:contains("район")',
            'p[class*="css"]',
            'span[class*="css"]'
          ];

          let titleElement = null;
          for (const selector of titleSelectors) {
            titleElement = element.querySelector(selector);
            if (titleElement) break;
          }

          let priceElement = null;
          for (const selector of priceSelectors) {
            priceElement = element.querySelector(selector);
            if (priceElement) break;
          }

          // Если цена не найдена, ищем по тексту
          if (!priceElement) {
            const allElements = element.querySelectorAll('p, span, div');
            for (const el of allElements) {
              const text = el.textContent?.trim() || '';
              if (text.includes('тг') && /\d+/.test(text)) {
                priceElement = el;
                break;
              }
            }
          }

          let locationElement = null;
          for (const selector of locationSelectors) {
            locationElement = element.querySelector(selector);
            if (locationElement) break;
          }

          // Если местоположение не найдено, ищем по тексту
          if (!locationElement) {
            const allElements = element.querySelectorAll('p, span, div');
            for (const el of allElements) {
              const text = el.textContent?.trim() || '';
              if (text.includes('район') || text.includes('Алматы') || text.includes('мкр')) {
                locationElement = el;
                break;
              }
            }
          }

          const linkElement = element.querySelector('a[href]');

          if (titleElement && linkElement) {
            const href = linkElement.getAttribute('href');
            const fullUrl = href?.startsWith('http') ? href : `https://www.olx.kz${href}`;

            // Очищаем текст цены от CSS и лишних символов
            let priceText = priceElement?.textContent?.trim() || 'Цена не указана';
            if (priceText.includes('.css-') || priceText.includes('..css-')) {
              // Ищем цену в начале строки до CSS-классов
              const priceMatch = priceText.match(/^[^.]*тг[^.]*/);
              if (priceMatch) {
                priceText = priceMatch[0].trim();
              } else {
                // Альтернативный поиск - только числа и "тг"
                const numbersMatch = priceText.match(/[\d\s]+тг/);
                if (numbersMatch) {
                  priceText = numbersMatch[0];
                }
              }
            }

            // Извлекаем ID из URL и ищем изображения
            const adId = href?.split('-').pop()?.replace('.html', '') || '';
            const jsonLdImages = imageMap.get(adId);

            let images: string[] = [];
            if (jsonLdImages && jsonLdImages.length > 0) {
              // Используем изображения из JSON-LD
              images = jsonLdImages;
            } else {
              // Ищем изображения в HTML как fallback
              const imageUrl = findBestImageUrl(element);
              images = imageUrl ? [processOlxImageUrl(imageUrl)] : [];
            }

            const property: PropertyItem = {
              title: String(titleElement.textContent?.trim() || 'Без названия'),
              price: String(priceText),
              location: String(locationElement?.textContent?.trim() || 'Местоположение не указано'),
              images: Array.isArray(images) ? images.map(img => String(img)) : [],
              url: String(fullUrl || ''),
              propertyId: String(adId)
            };

            properties.push(property);
          }
        } catch (error) {
          continue;
        }
      }
    }

    console.log(`📊 Всего извлечено объявлений: ${properties.length}`);
  }

  return { properties, paginationInfo };
}

export async function POST(request: NextRequest) {
  const startTime = new Date().toISOString();
  const timer = measureTime();

  try {
    // Rate limiting отключен для тестирования

    const body = await request.json();
    const filters: SearchFilters = body.filters || {};

    // Валидация фильтров
    if (filters.priceMin && isNaN(Number(filters.priceMin))) {
      return NextResponse.json(
        { error: 'Неверный формат минимальной цены' },
        { status: 400 }
      );
    }

    if (filters.priceMax && isNaN(Number(filters.priceMax))) {
      return NextResponse.json(
        { error: 'Неверный формат максимальной цены' },
        { status: 400 }
      );
    }

    if (filters.areaMin && isNaN(Number(filters.areaMin))) {
      return NextResponse.json(
        { error: 'Неверный формат минимальной площади' },
        { status: 400 }
      );
    }

    if (filters.areaMax && isNaN(Number(filters.areaMax))) {
      return NextResponse.json(
        { error: 'Неверный формат максимальной площади' },
        { status: 400 }
      );
    }

    // Строим URL для поиска
    const searchUrl = buildSearchUrl(filters);
    console.log('Поиск по URL:', searchUrl);

    // Парсим результаты поиска
    const searchResult = await parseSearchResults(searchUrl);
    const properties = searchResult.properties;
    const { totalPages, currentPage } = searchResult.paginationInfo;

    const responseTime = timer();

    // Логируем успешный запрос
    await requestTracker.logRequest({
      timestamp: startTime,
      url: searchUrl,
      success: true,
      statusCode: 200,
      responseTime
    });

    const stats = await requestTracker.getStats();

    return NextResponse.json({
      success: true,
      data: {
        properties,
        searchUrl,
        totalFound: properties.length,
        filters,
        pagination: {
          currentPage: currentPage,
          totalPages: totalPages,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1
        }
      },
      _stats: {
        responseTime,
        requestsToday: stats.requestsToday,
        totalRequests: stats.totalRequests,
        searchPerformed: true
      }
    });

  } catch (error) {
    const responseTime = timer();

    // Логируем ошибку
    await requestTracker.logRequest({
      timestamp: startTime,
      url: 'search-filter',
      success: false,
      statusCode: 500,
      responseTime,
      errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });

    console.error('Ошибка поиска OLX:', error);

    return NextResponse.json(
      {
        error: 'Ошибка поиска объявлений',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        _stats: {
          responseTime,
          error: true
        }
      },
      { status: 500 }
    );
  }
}

// GET запрос для получения информации о доступных фильтрах
export async function GET() {
  return NextResponse.json({
    availableFilters: {
      cities: [
        { value: 'almaty', label: 'Алматы' },
        { value: 'astana', label: 'Астана' },
        { value: 'shymkent', label: 'Шымкент' },
        { value: 'aktobe', label: 'Актобе' },
        { value: 'taraz', label: 'Тараз' }
      ],
      rooms: [
        { value: 'any', label: 'Любое количество' },
        { value: '1', label: '1 комната' },
        { value: '2', label: '2 комнаты' },
        { value: '3', label: '3 комнаты' },
        { value: '4+', label: '4+ комнат' }
      ],
      priceRange: {
        min: 0,
        max: 100000000,
        step: 100000
      },
      areaRange: {
        min: 0,
        max: 500,
        step: 10
      }
    },
    endpoints: {
      search: '/api/search-olx',
      singleParse: '/api/parse-olx'
    }
  });
}