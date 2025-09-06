import { By, WebDriver, until, WebElement } from 'selenium-webdriver'
import { PropertyFilters } from '@/types/PropertyFilters'
import { driverPool } from './DriverPool'

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

export class KrishaParser {
  private driver: WebDriver | null = null

  async init(): Promise<void> {
    this.driver = await driverPool.getDriver()
    console.log('Got driver from pool, pool stats:', driverPool.getStats())
  }

  async close(): Promise<void> {
    if (this.driver) {
      driverPool.releaseDriver(this.driver)
      this.driver = null
    }
  }

  private buildSearchUrl(filters: PropertyFilters): string {
    let url = 'https://krisha.kz/prodazha/kvartiry'
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

  async searchProperties(filters: PropertyFilters, maxPages: number = 3): Promise<ParsedProperty[]> {
    if (!this.driver) {
      throw new Error('Parser not initialized. Call init() first.')
    }

    const searchUrl = this.buildSearchUrl(filters)
    console.log('Searching at:', searchUrl)

    await this.driver.get(searchUrl)
    
    // Ждем загрузки страницы
    await this.driver.wait(until.elementLocated(By.css('.ddl_product, .a-card')), 10000)

    const allProperties: ParsedProperty[] = []
    
    for (let page = 1; page <= maxPages; page++) {
      console.log(`Parsing page ${page}...`)
      
      try {
        // Парсим объявления на текущей странице
        const pageProperties = await this.parseCurrentPage()
        allProperties.push(...pageProperties)

        // Переходим на следующую страницу
        if (page < maxPages) {
          const nextButton = await this.driver.findElements(By.css('.paging .next'))
          if (nextButton.length > 0 && await nextButton[0].isEnabled()) {
            await nextButton[0].click()
            await this.driver.sleep(1500) // Ждем загрузки
          } else {
            console.log('No more pages available')
            break
          }
        }
      } catch (error) {
        console.error(`Error parsing page ${page}:`, error)
        break
      }
    }

    return allProperties
  }

  private async parseCurrentPage(): Promise<ParsedProperty[]> {
    if (!this.driver) return []

    const properties: ParsedProperty[] = []
    
    try {
      console.log('Waiting for page to load...')
      
      // Ждем появления карточек объявлений - используем найденный класс ddl_product  
      await this.driver.sleep(1500) // Даем время загрузиться JavaScript
      
      // Используем самый эффективный селектор на основе предыдущих тестов
      let propertyCards: any[] = []
      
      try {
        // Основной селектор который работает лучше всего
        propertyCards = await this.driver.findElements(By.css('.ddl_product'))
        console.log(`Found ${propertyCards.length} property cards`)
        
        // Если основной селектор не работает, попробуем запасной
        if (propertyCards.length === 0) {
          propertyCards = await this.driver.findElements(By.css('.a-card'))
          console.log(`Fallback selector found ${propertyCards.length} cards`)
        }
      } catch (error) {
        console.log('Error finding property cards:', error.message)
      }
      
      console.log(`Total cards to parse: ${propertyCards.length}`)
      
      // Парсим максимум 15 объявлений для быстрой демонстрации
      const maxProperties = Math.min(propertyCards.length, 15)
      
      for (let i = 0; i < maxProperties; i++) {
        try {
          const property = await this.parsePropertyCard(propertyCards[i])
          if (property) {
            properties.push(property)
            console.log(`Parsed property ${i + 1}: ${property.title} - ${property.price} ${property.currency}`)
          }
        } catch (error) {
          console.error(`Error parsing property ${i}:`, error)
          continue
        }
      }
    } catch (error) {
      console.error('Error finding property cards:', error)
    }

    return properties
  }

  private async parsePropertyCard(card: WebElement): Promise<ParsedProperty | null> {
    if (!this.driver) return null

    try {
      // Базовые данные
      const titleElement = await card.findElement(By.css('.a-card__title'))
      const title = await titleElement.getText()
      
      const linkElement = await card.findElement(By.css('.a-card__title'))
      const url = await linkElement.getAttribute('href')
      
      // Цена
      let price = 0
      let currency = '₸'
      try {
        const priceElement = await card.findElement(By.css('.a-card__price'))
        const priceText = await priceElement.getText()
        const priceMatch = priceText.match(/(\d+(?:\s\d+)*)\s*([₸$]?)/)
        if (priceMatch) {
          price = parseInt(priceMatch[1].replace(/\s/g, ''))
          currency = priceMatch[2] || '₸'
        }
      } catch (error) {
        console.log('Price not found for property')
      }

      // Адрес
      let address = ''
      try {
        const addressElement = await card.findElement(By.css('.a-card__subtitle'))
        address = await addressElement.getText()
      } catch (error) {
        console.log('Address not found')
      }

      // Характеристики (комнаты, площадь, этаж)
      let rooms: number | null = null
      let area: number | null = null
      let floor: number | null = null
      let totalFloors: number | null = null

      try {
        const detailsElement = await card.findElement(By.css('.a-card__text'))
        const detailsText = await detailsElement.getText()
        
        // Извлекаем комнаты
        const roomsMatch = detailsText.match(/(\d+)-комн/)
        if (roomsMatch) {
          rooms = parseInt(roomsMatch[1])
        }

        // Извлекаем площадь
        const areaMatch = detailsText.match(/(\d+(?:\.\d+)?)\s*м²/)
        if (areaMatch) {
          area = parseFloat(areaMatch[1])
        }

        // Извлекаем этаж
        const floorMatch = detailsText.match(/(\d+)\/(\d+)\s*эт/)
        if (floorMatch) {
          floor = parseInt(floorMatch[1])
          totalFloors = parseInt(floorMatch[2])
        }
      } catch (error) {
        console.log('Details not found')
      }

      // Изображения
      const images: string[] = []
      try {
        const imageElements = await card.findElements(By.css('.a-card__image img'))
        for (const img of imageElements) {
          const src = await img.getAttribute('src')
          if (src) {
            images.push(src)
          }
        }
      } catch (error) {
        console.log('Images not found')
      }

      const property: ParsedProperty = {
        id: url?.split('/').pop()?.split('?')[0] || Math.random().toString(),
        title: title || 'Без названия',
        price,
        currency,
        address,
        rooms,
        area,
        floor,
        totalFloors,
        buildYear: null,
        images,
        description: title || '',
        url: url || '',
        sellerType: undefined,
        isNewBuilding: false,
        buildingType: undefined,
        kitchenArea: null,
        residentialComplex: undefined
      }

      return property

    } catch (error) {
      console.error('Error parsing property card:', error)
      return null
    }
  }

  // Парсинг детальной страницы объявления
  async parsePropertyDetails(url: string): Promise<Partial<ParsedProperty> | null> {
    if (!this.driver) return null

    try {
      await this.driver.get(url)
      await this.driver.wait(until.elementLocated(By.css('.offer__content')), 10000)

      const details: Partial<ParsedProperty> = {}

      // Подробное описание
      try {
        const descElement = await this.driver.findElement(By.css('.offer__description'))
        details.description = await descElement.getText()
      } catch (error) {
        console.log('Description not found')
      }

      // Характеристики из таблицы
      try {
        const charElements = await this.driver.findElements(By.css('.offer__advert-short-info tr'))
        
        for (const row of charElements) {
          const cells = await row.findElements(By.css('td'))
          if (cells.length >= 2) {
            const label = await cells[0].getText()
            const value = await cells[1].getText()

            if (label.includes('Год постройки')) {
              const year = parseInt(value)
              if (!isNaN(year)) details.buildYear = year
            }
            
            if (label.includes('Тип дома')) {
              if (value.includes('кирпич')) details.buildingType = 'brick'
              else if (value.includes('монолит')) details.buildingType = 'monolith'
              else if (value.includes('панель')) details.buildingType = 'panel'
              else details.buildingType = 'other'
            }
            
            if (label.includes('Площадь кухни')) {
              const kitchen = parseFloat(value)
              if (!isNaN(kitchen)) details.kitchenArea = kitchen
            }
            
            if (label.includes('ЖК') || label.includes('Жилой комплекс')) {
              details.residentialComplex = value
            }
          }
        }
      } catch (error) {
        console.log('Characteristics not found')
      }

      // Телефон продавца
      try {
        const phoneButton = await this.driver.findElement(By.css('[data-phone]'))
        await phoneButton.click()
        await this.driver.sleep(1000)
        
        const phoneElement = await this.driver.findElement(By.css('.phone-number'))
        details.phone = await phoneElement.getText()
      } catch (error) {
        console.log('Phone not found')
      }

      return details

    } catch (error) {
      console.error('Error parsing property details:', error)
      return null
    }
  }
}