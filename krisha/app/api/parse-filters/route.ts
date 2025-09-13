// app/api/parse-filters/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface ApartmentCard {
    id: string;
    uuid: string;
    title: string;
    price: string;
    area: string;
    floor: string;
    address: string;
    description: string;
    views: string;
    imageUrl: string;
    url: string;
    isUrgent: boolean;
    features: string[];
}

interface FilterParams {
    city: string;
    district?: string;
    priceFrom: string;
    priceTo: string;
    rooms: string;
    areaFrom?: string;
    areaTo?: string;
    kitchenAreaFrom?: string;
    kitchenAreaTo?: string;
    floorFrom?: string;
    floorTo?: string;
    floorNotFirst?: boolean;
    floorNotLast?: boolean;
    houseFloorFrom?: string;
    houseFloorTo?: string;
    yearFrom?: string;
    yearTo?: string;
    houseType?: string;
    whoType?: string;
    hasPhoto?: boolean;
    complex?: string;
    page: number;
    collectAllPages?: boolean; // Новый параметр для сбора всех страниц
    maxResults?: number; // Максимальное количество результатов (по умолчанию 200)
}

// Функция для извлечения изображения из карточки
function extractImageUrl(cardElement: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): string {
    // Сначала пытаемся найти существующее изображение в HTML
    const existingImg = cardElement.find('picture img, img').first();
    if (existingImg.length > 0) {
        let src = existingImg.attr('src');
        if (src && !src.includes('empty-photo') &&
            (src.includes('alakcell-photos-kr.kcdn.kz') || src.includes('krisha-photos.kcdn.online'))) {
            return src.startsWith('http') ? src : `https:${src}`;
        }
    }

    // Ищем data-photo-id в picture элементе для определения номера фото
    const pictureElement = cardElement.find('picture');
    let photoId = '1';
    if (pictureElement.length > 0) {
        const dataPhotoId = pictureElement.attr('data-photo-id');
        if (dataPhotoId) {
            photoId = dataPhotoId;
        }
    }

    // Пытаемся получить изображение из data-uuid с правильным номером фото
    const dataUuid = cardElement.attr('data-uuid');
    if (dataUuid) {
        const firstTwoChars = dataUuid.substring(0, 2);

        // Пробуем разные номера фотографий, начиная с найденного
        const photoNumbers = [photoId, '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
        const sizes = ['400x300', '750x470'];
        const domains = [
            'https://alakcell-photos-kr.kcdn.kz',
            'https://krisha-photos.kcdn.online'
        ];

        // Строим URL с приоритетом к найденному номеру фото
        for (const domain of domains) {
            for (const num of photoNumbers) {
                for (const size of sizes) {
                    const imageUrl = `${domain}/webp/${firstTwoChars}/${dataUuid}/${num}-${size}.webp`;
                    // Возвращаем первый построенный URL (приоритет по домену и номеру фото)
                    return imageUrl;
                }
            }
        }
    }

    // Проверяем data-photo-url атрибуты (часто содержат прямые ссылки на изображения)
    const photoUrlElements = cardElement.find('[data-photo-url]');
    if (photoUrlElements.length > 0) {
        const photoUrl = photoUrlElements.first().attr('data-photo-url');
        if (photoUrl && (photoUrl.includes('krisha-photos.kcdn.online') ||
                         photoUrl.includes('alakcell-photos-kr.kcdn.kz'))) {
            return photoUrl.startsWith('http') ? photoUrl : `https:${photoUrl}`;
        }
    }

    // Массив возможных селекторов для поиска изображений
    const imageSelectors = [
        'picture img',
        'img.a-card__image',
        '.a-card__photo img',
        '.card-photo img',
        '.photo img',
        '.gallery__small-item img', // Добавляем селектор для галереи
        'img[src*="krisha-photos.kcdn.online"]',
        'img[data-src*="krisha-photos.kcdn.online"]',
        'img[src*="alakcell-photos-kr.kcdn.kz"]',
        'img[data-src*="alakcell-photos-kr.kcdn.kz"]',
        'img[src*="krisha.kz"]',
        'img[data-src*="krisha.kz"]',
        'img'
    ];

    // Пробуем каждый селектор по очереди
    for (const selector of imageSelectors) {
        const img = cardElement.find(selector).first();
        if (img.length > 0) {
            // Проверяем различные атрибуты изображения
            const srcAttributes = ['src', 'data-src', 'data-original', 'data-lazy-src'];

            for (const attr of srcAttributes) {
                let src = img.attr(attr);
                if (src) {
                    // Очищаем и нормализуем URL
                    src = src.trim();

                    // Пропускаем placeholder изображения
                    if (src.includes('empty-photo') ||
                        src.includes('placeholder') ||
                        src.includes('no-image') ||
                        src.includes('/static/frontend/images/')) {
                        continue;
                    }

                    // Если URL содержит CDN krisha.kz или является относительным путем
                    if (src.includes('krisha-photos.kcdn.online') ||
                        src.includes('alakcell-photos-kr.kcdn.kz') ||
                        src.includes('krisha.kz') ||
                        src.startsWith('/')) {

                        // Нормализуем URL
                        if (src.startsWith('//')) {
                            return `https:${src}`;
                        } else if (src.startsWith('/')) {
                            // Не используем относительные пути для изображений krisha.kz
                            if (!src.includes('/static/')) {
                                return `https://krisha.kz${src}`;
                            }
                        } else if (src.startsWith('http')) {
                            return src;
                        } else {
                            // Если не начинается с http, добавляем https://
                            return `https://${src}`;
                        }
                    }
                }
            }
        }
    }

    // Если ничего не найдено, пробуем извлечь изображение из стилей
    const styleElement = cardElement.find('[style*="background-image"]').first();
    if (styleElement.length > 0) {
        const style = styleElement.attr('style') || '';
        const bgImageMatch = style.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/);
        if (bgImageMatch) {
            let src = bgImageMatch[1];
            if (src.includes('krisha-photos.kcdn.online') ||
                src.includes('alakcell-photos-kr.kcdn.kz') ||
                src.includes('krisha.kz')) {
                return src.startsWith('http') ? src : `https:${src}`;
            }
        }
    }

    return '';
}

// Функция для извлечения особенностей квартиры
function extractFeatures(cardElement: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): string[] {
    const features: string[] = [];

    // Ищем платные услуги (горячие, топ, срочно)
    cardElement.find('.paid-icon').each((i, element) => {
        const tooltip = $(element).find('.kr-tooltip__title').text().trim();
        if (tooltip) {
            features.push(tooltip);
        }
    });

    // Проверяем метки ипотеки, рассрочки, акций
    cardElement.find('.credit-badge').each((i, element) => {
        const badgeText = $(element).text().trim();
        if (badgeText && !features.includes(badgeText)) {
            features.push(badgeText);
        }
    });

    // Ищем метки "В залоге", "Новостройка"
    const mortgageLabel = cardElement.find('.a-is-mortgaged').text().trim();
    if (mortgageLabel && !features.includes(mortgageLabel)) {
        features.push(mortgageLabel);
    }

    const complexLabel = cardElement.find('.a-card__complex-label').text().trim();
    if (complexLabel && !features.includes(complexLabel)) {
        features.push(complexLabel);
    }

    return features;
}

// Функция для парсинга пагинации
function extractPaginationInfo($: cheerio.CheerioAPI) {
    let totalPages = 1;
    let hasNextPage = false;

    // Ищем пагинатор
    const paginator = $('.paginator, .pagination, nav.paginator');

    if (paginator.length > 0) {
        console.log('Найден пагинатор');

        // Получаем все номера страниц из кнопок пагинатора
        const pageNumbers: number[] = [];

        // Ищем все кнопки с data-page атрибутом или номерами страниц в тексте
        paginator.find('.paginator__btn, .pagination__btn, .page-btn, a[data-page]').each((i, element) => {
            const $btn = $(element);

            // Сначала пробуем получить из data-page
            const dataPage = $btn.attr('data-page');
            if (dataPage) {
                const pageNum = parseInt(dataPage);
                if (!isNaN(pageNum) && pageNum > 0) {
                    pageNumbers.push(pageNum);
                    console.log(`Найдена страница из data-page: ${pageNum}`);
                }
            } else {
                // Если нет data-page, пробуем извлечь из текста кнопки
                const pageText = $btn.text().trim();
                const pageNum = parseInt(pageText);
                if (!isNaN(pageNum) && pageNum > 0) {
                    pageNumbers.push(pageNum);
                    console.log(`Найдена страница из текста: ${pageNum}`);
                }
            }
        });

        // Также ищем номера страниц в href атрибутах
        paginator.find('a[href*="page="]').each((i, element) => {
            const href = $(element).attr('href') || '';
            const pageMatch = href.match(/page=(\d+)/);
            if (pageMatch) {
                const pageNum = parseInt(pageMatch[1]);
                if (!isNaN(pageNum) && pageNum > 0) {
                    pageNumbers.push(pageNum);
                    console.log(`Найдена страница из href: ${pageNum}`);
                }
            }
        });

        // Находим максимальный номер страницы
        if (pageNumbers.length > 0) {
            totalPages = Math.max(...pageNumbers);
            console.log(`Найденные номера страниц: [${pageNumbers.sort((a, b) => a - b).join(', ')}]`);
            console.log(`Максимальная страница: ${totalPages}`);
        }

        // Проверяем есть ли кнопка "Дальше" или "Next"
        const nextBtn = paginator.find('.paginator__btn--next, .pagination__btn--next, .next, .page-next, [class*="next"]');
        hasNextPage = nextBtn.length > 0;

        console.log(`Есть кнопка "Дальше": ${hasNextPage}`);
    } else {
        console.log('Пагинатор не найден, ищем альтернативные селекторы');

        // Если пагинатора нет, ищем альтернативные селекторы
        const altSelectors = [
            '.pagination .next',
            '.pager .next',
            'a[rel="next"]',
            '.page-next',
            '.next-page'
        ];

        for (const selector of altSelectors) {
            if ($(selector).length > 0) {
                hasNextPage = true;
                console.log(`Найдена кнопка "Дальше" через селектор: ${selector}`);
                break;
            }
        }

        // Ищем номера страниц в ссылках по всей странице
        const pageLinks = $('a[href*="page="]');
        const pageNumbers: number[] = [];

        pageLinks.each((i, element) => {
            const href = $(element).attr('href') || '';
            const pageMatch = href.match(/page=(\d+)/);
            if (pageMatch) {
                const pageNum = parseInt(pageMatch[1]);
                if (!isNaN(pageNum)) {
                    pageNumbers.push(pageNum);
                }
            }
        });

        if (pageNumbers.length > 0) {
            totalPages = Math.max(...pageNumbers);
            console.log(`Найдены номера страниц через ссылки: [${pageNumbers.sort((a, b) => a - b).join(', ')}]`);
            console.log(`Максимальная страница: ${totalPages}`);
        }
    }

    return { totalPages, hasNextPage };
}

// Функция для сбора данных со всех страниц пагинации
async function collectAllPages(filters: FilterParams, maxResults: number = 200): Promise<ApartmentCard[]> {
    const allApartments: ApartmentCard[] = [];
    let currentPage = 1;
    let totalPages = 1;

    console.log(`Начинаем сбор всех страниц, максимум ${maxResults} результатов`);

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    };

    do {
        // Создаем копию фильтров с текущей страницей
        const pageFilters = { ...filters, page: currentPage };
        const url = buildFilterUrl(pageFilters);

        console.log(`Парсим страницу ${currentPage}: ${url}`);

        try {
            const response = await fetch(url, { headers });

            if (!response.ok) {
                console.error(`Ошибка HTTP для страницы ${currentPage}: ${response.status}`);
                break;
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // Парсим карточки на текущей странице
            const pageApartments: ApartmentCard[] = [];
            $('.a-card').each((i, element) => {
                const $card = $(element);

                // Пропускаем рекламные блоки
                if ($card.hasClass('ddl_campaign') || $card.find('.adfox').length > 0) {
                    return;
                }

                const apartment = parseApartmentCard($card, $);
                if (apartment && apartment.title && apartment.price) {
                    pageApartments.push(apartment);
                }
            });

            console.log(`Найдено объявлений на странице ${currentPage}: ${pageApartments.length}`);

            // Добавляем найденные объявления к общему списку
            for (const apartment of pageApartments) {
                if (allApartments.length >= maxResults) {
                    console.log(`Достигнут лимит в ${maxResults} объявлений`);
                    return allApartments;
                }
                allApartments.push(apartment);
            }

            // Если это первая страница, определяем общее количество страниц
            if (currentPage === 1) {
                const paginationInfo = extractPaginationInfo($);
                totalPages = paginationInfo.totalPages;
                console.log(`Общее количество страниц: ${totalPages}`);

                // Если результатов меньше чем на одной странице, прекращаем
                if (pageApartments.length === 0) {
                    console.log('На первой странице нет результатов');
                    break;
                }
            }

            // Переходим к следующей странице
            currentPage++;

            // Добавляем небольшую задержку между запросами
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error(`Ошибка при парсинге страницы ${currentPage}:`, error);
            break;
        }

        // Проверяем, не превышаем ли мы общее количество страниц
        if (currentPage > totalPages) {
            console.log(`Достигнута последняя страница (${totalPages})`);
            break;
        }

        // Дополнительная защита от бесконечного цикла
        if (currentPage > 50) { // Максимум 50 страниц как защита
            console.log('Достигнут максимальный лимит страниц (50)');
            break;
        }

    } while (allApartments.length < maxResults);

    console.log(`Сбор завершен. Всего собрано объявлений: ${allApartments.length}`);
    return allApartments;
}

// Функция для парсинга одной карточки объявления
function parseApartmentCard(cardElement: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): ApartmentCard | null {
    try {
        const id = cardElement.attr('data-id');
        const uuid = cardElement.attr('data-uuid');

        if (!id || !uuid) {
            return null;
        }

        // Заголовок
        const title = cardElement.find('.a-card__title').text().trim();

        // Цена
        const price = cardElement.find('.a-card__price').text().trim();

        // URL объявления
        const url = cardElement.find('.a-card__title').attr('href') || '';

        // Адрес
        const address = cardElement.find('.a-card__subtitle').text().trim();

        // Описание
        const description = cardElement.find('.a-card__text-preview').text().trim();

        // Количество просмотров
        const views = cardElement.find('.a-view-count').text().trim() || '0';

        // Изображение
        const imageUrl = extractImageUrl(cardElement, $);

        // Логируем, если изображение не найдено для отладки
        if (!imageUrl) {
            console.log(`Изображение не найдено для объявления ${id} (${title.substring(0, 50)}...), UUID: ${uuid}`);
        } else {
            console.log(`Найдено изображение для ${id}: ${imageUrl}`);
        }

        // Проверяем на срочность
        const isUrgent = cardElement.hasClass('is-urgent') || cardElement.find('.a-card__label').text().includes('Срочно');

        // Особенности
        const features = extractFeatures(cardElement, $);

        // Извлекаем площадь и этаж из заголовка
        const titleMatch = title.match(/(\d+(?:\.\d+)?)\s*м².*?(\d+\/\d+)\s*этаж/);
        const area = titleMatch ? `${titleMatch[1]} м²` : '';
        const floor = titleMatch ? titleMatch[2] : '';

        return {
            id,
            uuid,
            title,
            price,
            area,
            floor,
            address,
            description,
            views,
            imageUrl,
            url,
            isUrgent,
            features
        };
    } catch (error) {
        console.error('Ошибка парсинга карточки:', error);
        return null;
    }
}

// Функция для построения URL с фильтрами
function buildFilterUrl(filters: FilterParams): string {
    const baseUrl = 'https://krisha.kz/prodazha/kvartiry';

    // Добавляем район к URL если указан
    let cityUrl = `${baseUrl}/${filters.city}`;
    if (filters.district) {
        cityUrl += `-${filters.district}`;
    }
    cityUrl += '/';

    const params = new URLSearchParams();

    // Базовые параметры
    if (filters.rooms) {
        params.append('das[live.rooms]', filters.rooms);
    }

    // Цена
    if (filters.priceFrom) {
        params.append('das[price][from]', filters.priceFrom);
    }
    if (filters.priceTo) {
        params.append('das[price][to]', filters.priceTo);
    }

    // Площадь общая
    if (filters.areaFrom) {
        params.append('das[live.square][from]', filters.areaFrom);
    }
    if (filters.areaTo) {
        params.append('das[live.square][to]', filters.areaTo);
    }

    // Площадь кухни
    if (filters.kitchenAreaFrom) {
        params.append('das[kitchen.square][from]', filters.kitchenAreaFrom);
    }
    if (filters.kitchenAreaTo) {
        params.append('das[kitchen.square][to]', filters.kitchenAreaTo);
    }

    // Этаж квартиры
    if (filters.floorFrom) {
        params.append('das[flat.floor][from]', filters.floorFrom);
    }
    if (filters.floorTo) {
        params.append('das[flat.floor][to]', filters.floorTo);
    }

    // Этажность дома
    if (filters.houseFloorFrom) {
        params.append('das[house.floor_num][from]', filters.houseFloorFrom);
    }
    if (filters.houseFloorTo) {
        params.append('das[house.floor_num][to]', filters.houseFloorTo);
    }

    // Год постройки
    if (filters.yearFrom) {
        params.append('das[house.year][from]', filters.yearFrom);
    }
    if (filters.yearTo) {
        params.append('das[house.year][to]', filters.yearTo);
    }

    // Тип дома
    if (filters.houseType) {
        params.append('das[house.type]', filters.houseType);
    }

    // Тип объявления (от кого)
    if (filters.whoType) {
        params.append('das[who]', filters.whoType);
    }

    // Дополнительные параметры
    if (filters.hasPhoto) {
        params.append('das[_sys.hasphoto]', '1');
    }

    if (filters.floorNotFirst) {
        params.append('das[floor_not_first]', '1');
    }

    if (filters.floorNotLast) {
        params.append('das[floor_not_last]', '1');
    }

    if (filters.complex) {
        params.append('das[map.complex]', filters.complex);
    }

    // Пагинация
    if (filters.page && filters.page > 1) {
        params.append('page', filters.page.toString());
    }

    const finalUrl = `${cityUrl}?${params.toString()}`;
    console.log('Сформированный URL с расширенными фильтрами:', finalUrl);

    return finalUrl;
}

export async function POST(request: NextRequest) {
    try {
        const filters: FilterParams = await request.json();

        // Валидация
        if (!filters.city) {
            return NextResponse.json(
                { error: 'Город обязателен' },
                { status: 400 }
            );
        }

        // Если нужно собрать все страницы
        if (filters.collectAllPages) {
            const maxResults = filters.maxResults || 200;
            console.log(`Режим сбора всех страниц активирован, лимит: ${maxResults}`);

            const allApartments = await collectAllPages(filters, maxResults);

            // Очистка данных
            allApartments.forEach(apartment => {
                apartment.title = apartment.title.replace(/\s+/g, ' ').trim();
                apartment.price = apartment.price.replace(/\s+/g, ' ').trim();
                apartment.address = apartment.address.replace(/\s+/g, ' ').trim();
                apartment.description = apartment.description.replace(/\s+/g, ' ').trim().substring(0, 200);
            });

            // Статистика по изображениям
            const apartmentsWithImages = allApartments.filter(apt => apt.imageUrl).length;
            const apartmentsWithoutImages = allApartments.length - apartmentsWithImages;

            console.log(`Итоговые результаты - Всего: ${allApartments.length}, с фото: ${apartmentsWithImages}, без фото: ${apartmentsWithoutImages}`);

            return NextResponse.json({
                apartments: allApartments,
                total: allApartments.length, // Общее количество = количеству собранных
                totalPages: 1, // В режиме всех страниц всегда 1 виртуальная страница
                currentPage: 1, // Все результаты на одной "виртуальной" странице
                hasNextPage: false, // Никогда нет следующей страницы в режиме всех страниц
                url: buildFilterUrl({ ...filters, page: 1 }),
                filters,
                isAllPagesMode: true, // Флаг для фронтенда
                imageStats: {
                    withImages: apartmentsWithImages,
                    withoutImages: apartmentsWithoutImages
                }
            });
        }

        // Обычный режим - одна страница
        const url = buildFilterUrl(filters);
        console.log(`Парсинг фильтров (одна страница): ${url}`);

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        };

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const apartments: ApartmentCard[] = [];

        // Парсим все карточки объявлений
        $('.a-card').each((i, element) => {
            const $card = $(element);

            // Пропускаем рекламные блоки
            if ($card.hasClass('ddl_campaign') || $card.find('.adfox').length > 0) {
                return;
            }

            const apartment = parseApartmentCard($card, $);
            if (apartment && apartment.title && apartment.price) {
                apartments.push(apartment);
            }
        });

        // Извлекаем информацию о пагинации
        const paginationInfo = extractPaginationInfo($);

        // Пытаемся найти общее количество найденных объявлений из заголовка
        let totalFound = 0;

        // Ищем текст "Найдено X объявлений" в разных местах
        const searchSubtitle = $('.a-search-subtitle, .search-results-nb').text();
        console.log('Search subtitle text:', searchSubtitle);

        const totalMatchFromSubtitle = searchSubtitle.match(/Найдено\s+(\d+(?:\s+\d+)*)\s+объявлени/i);
        if (totalMatchFromSubtitle) {
            // Убираем пробелы из числа (например "9 778" -> "9778")
            const cleanNumber = totalMatchFromSubtitle[1].replace(/\s+/g, '');
            totalFound = parseInt(cleanNumber);
            console.log(`Найдено общее количество из заголовка: ${totalFound}`);
        }

        // Если не нашли в заголовке, ищем в других местах
        if (!totalFound) {
            let totalText = '';

            const countSelectors = [
                '.search-results-header',
                '.results-count',
                '.found-count',
                '.search-results__count',
                '.listing-header',
                'h1',
                '.search-summary',
                '.page-title'
            ];

            for (const selector of countSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                    totalText += ' ' + element.text();
                }
            }

            // Также ищем в мета-данных и заголовке страницы
            totalText += ' ' + $('title').text();

            // Пытаемся извлечь число из всего найденного текста
            const totalMatches = totalText.match(/(\d+(?:\s+\d+)*)\s*(?:объявлени|результат|найден)/gi);

            if (totalMatches && totalMatches.length > 0) {
                // Берем самое большое число (обычно это общее количество)
                const numbers = totalMatches.map(match => {
                    const num = match.match(/(\d+(?:\s+\d+)*)/);
                    if (num) {
                        const cleanNumber = num[1].replace(/\s+/g, '');
                        return parseInt(cleanNumber);
                    }
                    return 0;
                });
                totalFound = Math.max(...numbers);
                console.log(`Найдено общее количество из альтернативного поиска: ${totalFound}`);
            }
        }

        // Если все еще не нашли счетчик, оцениваем на основе пагинации
        if (!totalFound && paginationInfo.totalPages > 1) {
            // Предполагаем 20 объявлений на странице (стандарт Krisha.kz)
            totalFound = Math.max(paginationInfo.totalPages * 20, apartments.length);
            console.log(`Оценочное общее количество на основе пагинации: ${totalFound}`);
        } else if (!totalFound) {
            totalFound = apartments.length;
        }

        // Статистика по изображениям
        const apartmentsWithImages = apartments.filter(apt => apt.imageUrl).length;
        const apartmentsWithoutImages = apartments.length - apartmentsWithImages;

        console.log(`Найдено объявлений: ${apartments.length}`);
        console.log(`С изображениями: ${apartmentsWithImages}, без изображений: ${apartmentsWithoutImages}`);
        console.log(`Общий счетчик: ${totalFound}`);
        console.log(`Всего страниц: ${paginationInfo.totalPages}`);
        console.log(`Есть следующая страница: ${paginationInfo.hasNextPage}`);

        // Очистка данных
        apartments.forEach(apartment => {
            apartment.title = apartment.title.replace(/\s+/g, ' ').trim();
            apartment.price = apartment.price.replace(/\s+/g, ' ').trim();
            apartment.address = apartment.address.replace(/\s+/g, ' ').trim();
            apartment.description = apartment.description.replace(/\s+/g, ' ').trim().substring(0, 200);
        });

        return NextResponse.json({
            apartments,
            total: totalFound,
            totalPages: paginationInfo.totalPages,
            currentPage: filters.page,
            hasNextPage: paginationInfo.hasNextPage,
            url,
            filters
        });

    } catch (error) {
        console.error('Ошибка парсинга фильтров:', error);

        return NextResponse.json(
            {
                error: 'Ошибка при парсинге страницы. Проверьте параметры и попробуйте позже.',
                details: error instanceof Error ? error.message : 'Неизвестная ошибка'
            },
            { status: 500 }
        );
    }
}

// GET метод для тестирования
export async function GET() {
    return NextResponse.json({
        message: 'Krisha.kz Filters Parser API готов к работе',
        usage: 'POST /api/parse-filters with { city, priceFrom, priceTo, rooms, page }',
        example: {
            city: 'almaty',
            district: 'bostandykskiy',
            priceFrom: '10000000',
            priceTo: '50000000',
            rooms: '2',
            areaFrom: '50',
            areaTo: '70',
            kitchenAreaFrom: '8',
            kitchenAreaTo: '15',
            floorFrom: '1',
            floorTo: '12',
            floorNotFirst: true,
            floorNotLast: true,
            houseFloorFrom: '1',
            houseFloorTo: '12',
            yearFrom: '1985',
            yearTo: '2024',
            houseType: '1',
            whoType: '1',
            hasPhoto: true,
            page: 1,
            collectAllPages: true, // Собрать все страницы
            maxResults: 200 // Максимум результатов
        },
        response: {
            apartments: 'Array<ApartmentCard>',
            total: 'number - общее количество найденных объявлений',
            totalPages: 'number - общее количество страниц',
            currentPage: 'number - текущая страница',
            hasNextPage: 'boolean - есть ли следующая страница',
            url: 'string - сформированный URL для парсинга',
            filters: 'FilterParams - использованные параметры фильтрации'
        },
        version: '1.2.0'
    });
}