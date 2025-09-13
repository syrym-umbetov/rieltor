/**
 * Утилита для парсинга данных о недвижимости из markdown ответов AI
 */

export interface ParsedProperty {
    id?: string
    title: string
    price: string
    address: string
    image?: string
    link: string
    area?: string
    rooms?: number
    floor?: string
}

/**
 * Парсит markdown текст и извлекает данные о недвижимости
 */
export function parsePropertyMarkdown(content: string): ParsedProperty[] {
    const properties: ParsedProperty[] = []
    const seenProperties = new Set<string>() // Для проверки дубликатов

    console.log('🔍 Парсинг контента:', content.substring(0, 200) + '...')

    // Попробуем разные способы разбиения текста
    let sections: string[] = []

    // Сначала пробуем разбить по разделителям ---
    if (content.includes('---')) {
        sections = content.split('---').filter(section => section.trim())
    } else {
        // Если нет разделителей, пробуем разбить по номерам объявлений
        const numberPattern = /^\*\*\d+\./gm
        const matches = Array.from(content.matchAll(numberPattern))

        if (matches.length > 1) {
            sections = []
            for (let i = 0; i < matches.length; i++) {
                const start = matches[i].index!
                const end = i < matches.length - 1 ? matches[i + 1].index! : content.length
                const section = content.substring(start, end).trim()
                if (section) {
                    sections.push(section)
                }
            }
        } else {
            // Если и это не работает, берем весь текст как один раздел
            sections = [content]
        }
    }

    sections.forEach((section, index) => {
        const lines = section.split('\n').filter(line => line.trim())
        const property: Partial<ParsedProperty> = {}

        lines.forEach(line => {
            const trimmed = line.trim()

            // Заголовок (различные форматы)
            if (trimmed.match(/^\*\*\d+\./)) {
                // Формат: **1. Название**
                property.title = trimmed.replace(/^\*\*\d+\.\s*/, '').replace(/\*\*$/, '').trim()
            } else if (trimmed.startsWith('🏢 **') || trimmed.startsWith('🏠 **')) {
                // Формат: 🏢 **Название**
                property.title = trimmed.replace(/🏢\s*\*\*|🏠\s*\*\*/, '').replace(/\*\*$/, '').trim()
            } else if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.includes('млн') && !trimmed.includes('тыс') && !property.title) {
                // Общий формат для заголовков (только если заголовок еще не установлен)
                const candidateTitle = trimmed.replace(/^\*\*/, '').replace(/\*\*$/, '').trim()
                // Проверяем, что это действительно похоже на заголовок объявления
                if (candidateTitle.length > 5 && !candidateTitle.match(/^\d+$/)) {
                    property.title = candidateTitle
                }
            }

            // Цена
            if (trimmed.startsWith('💰 Цена:')) {
                property.price = trimmed.replace('💰 Цена:', '').trim()
            } else if (trimmed.match(/💰.*?[\d\s,.]+(млн|тыс)/)) {
                const priceMatch = trimmed.match(/💰.*?([\d\s,.]+\s*(млн|тыс)\s*₸?)/)
                if (priceMatch) {
                    property.price = priceMatch[1].trim()
                }
            }

            // Адрес
            if (trimmed.startsWith('📍 Адрес:')) {
                property.address = trimmed.replace('📍 Адрес:', '').trim()
            }

            // Количество комнат
            if (trimmed.startsWith('🚪 Комнат:')) {
                const roomsMatch = trimmed.match(/🚪 Комнат:\s*(\d+)/)
                if (roomsMatch) {
                    property.rooms = parseInt(roomsMatch[1])
                }
            }

            // Площадь
            if (trimmed.startsWith('📐 Площадь:')) {
                const areaMatch = trimmed.match(/📐 Площадь:\s*([\d.]+)\s*м²?/)
                if (areaMatch) {
                    property.area = areaMatch[1]
                }
            }

            // Этаж
            if (trimmed.startsWith('🏢 Этаж:')) {
                const floorMatch = trimmed.match(/🏢 Этаж:\s*([\d/]+)/)
                if (floorMatch) {
                    property.floor = floorMatch[1]
                }
            }

            // Изображения (берем первое найденное)
            if (trimmed.includes('![') && trimmed.includes('](') && !property.image) {
                const imageMatch = trimmed.match(/!\[.*?\]\((.*?)\)/)
                if (imageMatch && imageMatch[1]) {
                    property.image = imageMatch[1]
                }
            }

            // Ссылка
            if (trimmed.includes('[Подробнее]') || trimmed.includes('[🔗]')) {
                const linkMatch = trimmed.match(/\[(Подробнее|🔗)\]\((.*?)\)/)
                if (linkMatch && linkMatch[2]) {
                    property.link = linkMatch[2]
                }
            }
        })

        // Проверяем, что у нас есть основные данные
        if (property.title && (property.price || property.address)) {
            // Создаем уникальный ключ для проверки дубликатов
            const uniqueKey = `${property.title}_${property.price}_${property.address}`.replace(/\s+/g, '').toLowerCase()

            // Пропускаем дубликаты
            if (seenProperties.has(uniqueKey)) {
                return
            }
            seenProperties.add(uniqueKey)

            // Устанавливаем значения по умолчанию
            if (!property.address) property.address = 'Адрес не указан'
            if (!property.price) property.price = 'Цена не указана'
            if (!property.link) property.link = '#'

            // Генерируем уникальный ID
            property.id = `property_${properties.length}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

            properties.push(property as ParsedProperty)
        }
    })

    console.log(`✅ Парсинг завершен. Найдено ${properties.length} уникальных объектов из ${sections.length} секций`)
    console.log('📋 Объекты:', properties.map(p => ({ title: p.title?.substring(0, 30), price: p.price })))

    return properties
}

/**
 * Проверяет, содержит ли текст информацию о недвижимости
 */
export function isPropertyContent(content: string): boolean {
    const propertyKeywords = [
        '🏠', '🏢', '💰', '📍', '🚪', '📐',
        'квартира', 'недвижимость', 'объект',
        'цена', 'адрес', 'комнат', 'площадь',
        'млн ₸', 'тыс ₸', 'krisha.kz'
    ]

    return propertyKeywords.some(keyword =>
        content.toLowerCase().includes(keyword.toLowerCase())
    )
}

/**
 * Форматирует цену в удобочитаемый вид
 */
export function formatPrice(price: string | number): string {
    if (typeof price === 'string') {
        // Если уже отформатирована
        if (price.includes('млн') || price.includes('тыс')) {
            return price.includes('₸') ? price : `${price} ₸`
        }

        // Извлекаем число из строки
        const numMatch = price.match(/([\d\s,\.]+)/)
        if (!numMatch) return price

        const num = parseInt(numMatch[1].replace(/[\s,\.]/g, ''))
        return formatPrice(num)
    }

    const num = price as number

    if (num >= 1000000) {
        const millions = num / 1000000
        if (millions >= 10) {
            return `${Math.round(millions)} млн ₸`
        } else {
            return `${millions.toFixed(1)} млн ₸`
        }
    } else if (num >= 1000) {
        const thousands = num / 1000
        return `${Math.round(thousands)} тыс ₸`
    }

    return `${num.toLocaleString('ru-RU')} ₸`
}

/**
 * Извлекает статистику из текста
 */
export function extractPropertyStats(content: string): {
    totalFound: number
    withImages: number
    location?: string
} | null {
    // Ищем общую статистику
    const totalMatch = content.match(/Найдено (\d+) объект/i) ||
                      content.match(/Показано всех (\d+) найденных объектов/i) ||
                      content.match(/(\d+) объектов недвижимости/i)

    const imagesMatch = content.match(/С изображениями: (\d+)/i) ||
                       content.match(/(\d+) с фото/i)

    const locationMatch = content.match(/в городе \*\*?([^*\n]+)\*\*?/i) ||
                         content.match(/город[еа]?:?\s*([А-Яа-я-]+)/i)

    if (!totalMatch) return null

    return {
        totalFound: parseInt(totalMatch[1]),
        withImages: imagesMatch ? parseInt(imagesMatch[1]) : 0,
        location: locationMatch ? locationMatch[1].trim() : undefined
    }
}