import { PropertyFilters } from '@/types/PropertyFilters'

export interface ParsedProperty {
  id: string
  title: string
  price: number
  currency: string
  address: string
  rooms: number | null
  area: number | null
  floor: number | null
  totalFloors: number | null
  buildYear: number | null
  images: string[]
  description: string
  url: string
  phone?: string
  isNewBuilding?: boolean
  buildingType?: string
  sellerType?: 'owner' | 'agent' | 'developer'
  kitchenArea?: number | null
  residentialComplex?: string
}

export class KrishaHttpParser {
  private readonly baseUrl = 'https://krisha.kz'
  
  private buildSearchUrl(filters: PropertyFilters): string {
    let url = `${this.baseUrl}/prodazha/kvartiry`
    const params = new URLSearchParams()

    // Город (по умолчанию Алматы)
    if (filters.city === 'Алматы' || !filters.city) {
      url += '/almaty'
    } else if (filters.city === 'Нур-Султан' || filters.city === 'Астана') {
      url += '/nur-sultan'
    }

    // Количество комнат
    if (filters.rooms) {
      params.append('das[live.rooms][]', filters.rooms.toString())
    }

    // Цена
    if (filters.priceMin) {
      params.append('das[price][from]', filters.priceMin.toString())
    }
    if (filters.priceMax) {
      params.append('das[price][to]', filters.priceMax.toString())
    }

    // Площадь
    if (filters.totalAreaFrom) {
      params.append('das[live_square][from]', filters.totalAreaFrom.toString())
    }
    if (filters.totalAreaTo) {
      params.append('das[live_square][to]', filters.totalAreaTo.toString())
    }

    // Этаж
    if (filters.floorFrom) {
      params.append('das[flat.floor][from]', filters.floorFrom.toString())
    }
    if (filters.floorTo) {
      params.append('das[flat.floor][to]', filters.floorTo.toString())
    }

    // Этажность дома
    if (filters.totalFloorsTo) {
      params.append('das[house.floor_num][to]', filters.totalFloorsTo.toString())
    }

    // Год постройки
    if (filters.buildYearFrom) {
      params.append('das[house.year][from]', filters.buildYearFrom.toString())
    }
    if (filters.buildYearTo) {
      params.append('das[house.year][to]', filters.buildYearTo.toString())
    }

    // Только с фото
    if (filters.hasPhotos) {
      params.append('das[_sys.hasphoto]', '1')
    }

    // Новостройка
    if (filters.isNewBuilding) {
      params.append('das[novostroiki]', '1')
    }

    // От собственника
    if (filters.sellerType === 'owner') {
      params.append('das[who]', '1')
    }

    // Не первый этаж
    if (filters.notFirstFloor) {
      params.append('das[floor_not_first]', '1')
    }

    // Не последний этаж  
    if (filters.notLastFloor) {
      params.append('das[floor_not_last]', '1')
    }

    // Жилой комплекс (если указан конкретный ID)
    if (filters.residentialComplex && /^\d+$/.test(filters.residentialComplex)) {
      params.append('das[map.complex]', filters.residentialComplex)
    }

    const searchParams = params.toString()
    return searchParams ? `${url}?${searchParams}` : url
  }

  async searchProperties(filters: PropertyFilters, maxPages: number = 2): Promise<ParsedProperty[]> {
    const searchUrl = this.buildSearchUrl(filters)
    console.log('Generated Krisha.kz URL:', searchUrl)
    
    try {
      // Пробуем получить реальные данные с Krisha.kz
      console.log('Fetching real data from Krisha.kz...')
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      console.log(`Received ${html.length} characters from Krisha.kz`)
      
      // Анализируем структуру HTML для понимания разметки
      this.analyzeHtmlStructure(html)
      
      // Парсим HTML
      const properties = this.parseHtml(html, searchUrl)
      console.log(`Parsed ${properties.length} properties from real data`)
      
      if (properties.length > 0) {
        return properties
      } else {
        console.log('No properties found in real data, falling back to mock data')
        return this.generateMockData(filters)
      }
      
    } catch (error) {
      console.error('Error fetching from Krisha.kz:', error)
      console.log('Falling back to mock data')
      return this.generateMockData(filters)
    }
  }

  private analyzeHtmlStructure(html: string): void {
    console.log('=== АНАЛИЗ СТРУКТУРЫ KRISHA.KZ ===')
    
    // Ищем различные возможные классы для карточек объявлений
    const possibleCardClasses = [
      'ddl_product', 'a-card', 'card', 'offer', 'item', 'listing', 
      'product', 'advert', 'advertisement', 'house-item', 'apartment'
    ]
    
    const foundClasses: string[] = []
    possibleCardClasses.forEach(className => {
      const regex = new RegExp(`class="[^"]*${className}[^"]*"`, 'gi')
      const matches = html.match(regex)
      if (matches && matches.length > 0) {
        foundClasses.push(`${className} (${matches.length} matches)`)
      }
    })
    
    console.log('Найденные возможные классы карточек:', foundClasses)
    
    // Ищем JSON данные
    const jsonPatterns = [
      /window\.__INITIAL_STATE__\s*=\s*({.*?});/s,
      /window\.__NUXT__\s*=\s*({.*?});/s,
      /"items"\s*:\s*\[/,
      /"products"\s*:\s*\[/,
      /"list"\s*:\s*\[/,
      /var\s+\w+\s*=\s*\[.*?\]/s
    ]
    
    jsonPatterns.forEach((pattern, index) => {
      if (html.match(pattern)) {
        console.log(`JSON pattern ${index + 1} найден`)
      }
    })
    
    // Ищем ID и data-атрибуты
    const dataAttributes = html.match(/data-[\w-]+="[^"]*"/g) || []
    const uniqueDataAttrs = [...new Set(dataAttributes.map(attr => attr.split('=')[0]))]
    console.log('Data-атрибуты:', uniqueDataAttrs.slice(0, 10))
    
    // Ищем возможные контейнеры списков
    const listContainers = [
      'list', 'items', 'products', 'results', 'content', 
      'main', 'container', 'grid', 'catalog'
    ]
    
    listContainers.forEach(container => {
      const regex = new RegExp(`class="[^"]*${container}[^"]*"`, 'gi')
      const matches = html.match(regex)
      if (matches) {
        console.log(`Контейнер ${container}: ${matches.length} matches`)
      }
    })
    
    console.log('=== КОНЕЦ АНАЛИЗА ===')
  }

  private parseHtml(html: string, baseUrl: string): ParsedProperty[] {
    const properties: ParsedProperty[] = []
    
    try {
      console.log('Parsing HTML with improved structure understanding...')
      
      // Ищем карточки объявлений разными способами
      console.log('Trying multiple patterns to find property cards...')
      
      // Паттерн 1: ddl_product ссылки (основные карточки)
      const ddlProductRegex = /<a[^>]*class="[^"]*ddl_product[^"]*"[^>]*>[\s\S]*?<\/a>/gs
      const productMatches = html.match(ddlProductRegex) || []
      console.log(`Pattern ddl_product links: ${productMatches.length} matches`)
      
      // Паттерн 2: Блоки с ссылками на /a/show/
      const showLinkRegex = /<[^>]*href="[^"]*\/a\/show\/\d+[^"]*"[^>]*>[\s\S]*?(?=<(?:div|a|section))/gs
      const showMatches = html.match(showLinkRegex) || []
      console.log(`Pattern show links: ${showMatches.length} matches`)
      
      // Паттерн 3: Любые блоки содержащие krisha.kz ссылки и данные о недвижимости
      const krishaLinkRegex = /<[^>]*(?:href="[^"]*krisha\.kz[^"]*"|class="[^"]*(?:card|offer|item|product)[^"]*")[^>]*>[\s\S]*?(?=<(?:div|a|section|article))/gs  
      const krishaMatches = html.match(krishaLinkRegex) || []
      console.log(`Pattern krisha links: ${krishaMatches.length} matches`)
      
      // Паттерн 4: Текстовые блоки с ценами и адресами (fallback)
      const textBlockRegex = />([^<]*(?:\d+\s*млн|\d+\s*₸|\d+[\s,]\d+\s*₸)[^<]*(?:р-н|ул\.|мкр)[^<]*)</g
      const textMatches = [...html.matchAll(textBlockRegex)].map(match => match[0]) || []
      console.log(`Pattern text blocks: ${textMatches.length} matches`)
      
      // Объединяем все найденные совпадения, убираем дубликаты
      let allMatches = [
        ...productMatches,
        ...showMatches, 
        ...krishaMatches,
        ...textMatches
      ]
      
      // Убираем дубликаты по содержимому
      const uniqueMatches = Array.from(new Set(allMatches.map(m => m.substring(0, 100))))
        .map(signature => allMatches.find(m => m.startsWith(signature)) || '')
        .filter(Boolean)
      
      console.log(`Total unique cards to process: ${uniqueMatches.length}`)
      allMatches = uniqueMatches

      for (let i = 0; i < Math.min(allMatches.length, 20); i++) {
        const cardHtml = allMatches[i]
        
        // Извлекаем заголовок
        const titleMatch = cardHtml.match(/<div[^>]*class="[^"]*a-card__title[^"]*"[^>]*>(.*?)<\/div>/s)
        const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'Объявление недвижимости'

        // Извлекаем цену
        const priceMatch = cardHtml.match(/<div[^>]*class="[^"]*a-card__price[^"]*"[^>]*>(.*?)<\/div>/s)
        let price = 0
        let currency = '₸'
        
        if (priceMatch) {
          const priceText = priceMatch[1].replace(/<[^>]*>/g, '').trim()
          const priceNumber = priceText.match(/(\d+(?:\s\d+)*)/)?.[1]
          if (priceNumber) {
            price = parseInt(priceNumber.replace(/\s/g, ''))
          }
          if (priceText.includes('$')) currency = '$'
        }

        // Извлекаем адрес
        const addressMatch = cardHtml.match(/<div[^>]*class="[^"]*a-card__subtitle[^"]*"[^>]*>(.*?)<\/div>/s)
        const address = addressMatch ? addressMatch[1].replace(/<[^>]*>/g, '').trim() : 'Алматы'

        // Извлекаем характеристики
        const detailsMatch = cardHtml.match(/<div[^>]*class="[^"]*a-card__text[^"]*"[^>]*>(.*?)<\/div>/s)
        let rooms: number | null = null
        let area: number | null = null
        let floor: number | null = null
        let totalFloors: number | null = null

        if (detailsMatch) {
          const detailsText = detailsMatch[1].replace(/<[^>]*>/g, '').trim()
          
          const roomsMatch = detailsText.match(/(\d+)-комн/)
          if (roomsMatch) rooms = parseInt(roomsMatch[1])

          const areaMatch = detailsText.match(/(\d+(?:\.\d+)?)\s*м²/)
          if (areaMatch) area = parseFloat(areaMatch[1])

          const floorMatch = detailsText.match(/(\d+)\/(\d+)\s*эт/)
          if (floorMatch) {
            floor = parseInt(floorMatch[1])
            totalFloors = parseInt(floorMatch[2])
          }
        }

        // Извлекаем ссылку
        const linkMatch = cardHtml.match(/href="([^"]+)"/s)
        const url = linkMatch ? `${this.baseUrl}${linkMatch[1]}` : baseUrl

        const property: ParsedProperty = {
          id: `krisha_${i}_${Date.now()}`,
          title,
          price,
          currency,
          address,
          rooms,
          area,
          floor,
          totalFloors,
          buildYear: null,
          images: [`https://via.placeholder.com/300x200?text=Фото+${i + 1}`], // Mock изображения
          description: title,
          url,
          sellerType: undefined,
          isNewBuilding: false,
          buildingType: undefined,
          kitchenArea: null,
          residentialComplex: undefined
        }

        properties.push(property)
      }
    } catch (error) {
      console.error('HTML parsing error:', error)
    }

    return properties
  }

  private generateMockData(filters: PropertyFilters): ParsedProperty[] {
    // Генерируем mock данные для демонстрации
    const mockProperties: ParsedProperty[] = []
    const addresses = [
      'мкр. Самал-2, дом 111',
      'ул. Абая, 150/230',
      'мкр. Мамыр-7, дом 8',
      'ул. Розыбакиева, 247',
      'мкр. Алмагуль, дом 2',
      'ул. Жандосова, 140'
    ]

    const titles = [
      '2-комнатная квартира в новом доме',
      'Просторная квартира с ремонтом',
      'Квартира в жилом комплексе',
      'Уютная квартира в центре',
      'Квартира с панорамными окнами',
      'Современная квартира в новостройке'
    ]

    for (let i = 0; i < 6; i++) {
      const basePrice = filters.rooms ? filters.rooms * 15000000 : 30000000
      const priceVariation = (Math.random() - 0.5) * 10000000
      const finalPrice = Math.max(basePrice + priceVariation, 15000000)

      mockProperties.push({
        id: `mock_${i}`,
        title: titles[i],
        price: Math.round(finalPrice),
        currency: '₸',
        address: addresses[i],
        rooms: filters.rooms || Math.floor(Math.random() * 3) + 1,
        area: Math.round(45 + Math.random() * 60),
        floor: Math.floor(Math.random() * 15) + 1,
        totalFloors: Math.floor(Math.random() * 10) + 15,
        buildYear: 2015 + Math.floor(Math.random() * 8),
        images: [
          `https://via.placeholder.com/400x300?text=Фото+${i + 1}`,
          `https://via.placeholder.com/400x300?text=Интерьер+${i + 1}`
        ],
        description: `${titles[i]}. Отличное состояние, хорошая планировка, развитая инфраструктура.`,
        url: `https://krisha.kz/a/show/mock-${i}`,
        phone: `+7 (701) ${String(Math.random()).substring(2, 5)}-${String(Math.random()).substring(2, 4)}-${String(Math.random()).substring(2, 4)}`,
        isNewBuilding: Math.random() > 0.5,
        buildingType: ['brick', 'monolith', 'panel'][Math.floor(Math.random() * 3)] as any,
        sellerType: ['owner', 'agent'][Math.floor(Math.random() * 2)] as any,
        kitchenArea: Math.round(8 + Math.random() * 12),
        residentialComplex: Math.random() > 0.5 ? `ЖК "Алатау ${i + 1}"` : undefined
      })
    }

    return mockProperties
  }
}