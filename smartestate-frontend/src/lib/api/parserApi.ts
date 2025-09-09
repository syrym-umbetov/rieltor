import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

// Типы для backend API
export interface BackendPropertyFilters {
  property_type?: string
  city?: string
  rooms?: number
  price_min?: number
  price_max?: number
  total_area_from?: number
  total_area_to?: number
  floor_from?: number
  floor_to?: number
  total_floors_from?: number
  total_floors_to?: number
  build_year_from?: number
  build_year_to?: number
  has_photos?: boolean
  is_new_building?: boolean
  seller_type?: string
  not_first_floor?: boolean
  not_last_floor?: boolean
  residential_complex?: string
}

export interface BackendParsedProperty {
  id: string
  title: string
  price: number
  currency: string
  address: string
  rooms?: number
  area?: number
  floor?: number
  total_floors?: number
  build_year?: number
  images: string[]
  description: string
  url: string
  phone?: string
  is_new_building?: boolean
  building_type?: string
  seller_type?: string
  kitchen_area?: number
  residential_complex?: string
}

export interface ParseResponse {
  success: boolean
  request_id: string
  properties: BackendParsedProperty[]
  count: number
  status: string
  error?: string
  cached: boolean
  parser_type: string
}

export interface ParseRequest {
  filters: BackendPropertyFilters
  max_pages: number
}

class ParserApi {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  // Конвертация фильтров фронтенда в формат backend
  private convertFilters(filters: any): BackendPropertyFilters {
    const backendFilters: BackendPropertyFilters = {}

    if (filters.propertyType) backendFilters.property_type = filters.propertyType
    if (filters.city) backendFilters.city = filters.city
    if (filters.rooms) backendFilters.rooms = filters.rooms
    if (filters.priceMin) backendFilters.price_min = filters.priceMin
    if (filters.priceMax) backendFilters.price_max = filters.priceMax
    if (filters.totalAreaFrom) backendFilters.total_area_from = filters.totalAreaFrom
    if (filters.totalAreaTo) backendFilters.total_area_to = filters.totalAreaTo
    if (filters.floorFrom) backendFilters.floor_from = filters.floorFrom
    if (filters.floorTo) backendFilters.floor_to = filters.floorTo
    if (filters.totalFloorsFrom) backendFilters.total_floors_from = filters.totalFloorsFrom
    if (filters.totalFloorsTo) backendFilters.total_floors_to = filters.totalFloorsTo
    if (filters.buildYearFrom) backendFilters.build_year_from = filters.buildYearFrom
    if (filters.buildYearTo) backendFilters.build_year_to = filters.buildYearTo
    if (filters.hasPhotos !== undefined) backendFilters.has_photos = filters.hasPhotos
    if (filters.isNewBuilding !== undefined) backendFilters.is_new_building = filters.isNewBuilding
    if (filters.sellerType) backendFilters.seller_type = filters.sellerType
    if (filters.notFirstFloor !== undefined) backendFilters.not_first_floor = filters.notFirstFloor
    if (filters.notLastFloor !== undefined) backendFilters.not_last_floor = filters.notLastFloor
    if (filters.residentialComplex) backendFilters.residential_complex = filters.residentialComplex

    return backendFilters
  }

  // Конвертация свойств backend в формат фронтенда
  private convertProperty(backendProperty: BackendParsedProperty): any {
    return {
      id: backendProperty.id,
      title: backendProperty.title,
      price: backendProperty.price,
      currency: backendProperty.currency,
      address: backendProperty.address,
      rooms: backendProperty.rooms,
      area: backendProperty.area,
      floor: backendProperty.floor,
      totalFloors: backendProperty.total_floors,
      buildYear: backendProperty.build_year,
      images: backendProperty.images,
      description: backendProperty.description,
      url: backendProperty.url,
      phone: backendProperty.phone,
      isNewBuilding: backendProperty.is_new_building,
      buildingType: backendProperty.building_type,
      sellerType: backendProperty.seller_type,
      kitchenArea: backendProperty.kitchen_area,
      residentialComplex: backendProperty.residential_complex,
    }
  }

  // Парсинг недвижимости
  async parseProperties(filters: any, maxPages: number = 2): Promise<any> {
    try {
      console.log('Отправка запроса на парсинг с фильтрами:', filters)

      const backendFilters = this.convertFilters(filters)
      const request: ParseRequest = {
        filters: backendFilters,
        max_pages: Math.min(maxPages, 5) // Ограничиваем максимум 5 страниц
      }

      const response = await axios.post(`${this.baseUrl}/parser/properties`, request, {
        timeout: 120000, // 2 минуты таймаут для парсинга
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data: ParseResponse = response.data

      if (!data.success) {
        throw new Error(data.error || 'Парсинг не удался')
      }

      // Конвертируем свойства в формат фронтенда
      const convertedProperties = data.properties.map(prop => this.convertProperty(prop))

      return {
        success: true,
        properties: convertedProperties,
        count: data.count,
        searchParams: filters,
        parserType: data.parser_type,
        cached: data.cached,
        requestId: data.request_id
      }
    } catch (error: any) {
      console.error('Ошибка при парсинге:', error)

      if (error.response?.data) {
        throw new Error(error.response.data.message || error.response.data.error || 'Ошибка парсинга')
      }

      if (error.message.includes('timeout')) {
        throw new Error('Тайм-аут при парсинге. Попробуйте уменьшить количество страниц.')
      }

      throw new Error(error.message || 'Ошибка соединения с сервером')
    }
  }

  // Тестовый парсинг
  async testParse(city: string = 'Алматы', rooms: number = 2, maxPrice: number = 50000000): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/parser/test`, {
        params: { city, rooms, max_price: maxPrice },
        timeout: 60000
      })

      const data: ParseResponse = response.data

      if (!data.success) {
        throw new Error(data.error || 'Тестовый парсинг не удался')
      }

      const convertedProperties = data.properties.map(prop => this.convertProperty(prop))

      return {
        success: true,
        properties: convertedProperties,
        count: data.count,
        parserType: data.parser_type,
        cached: data.cached
      }
    } catch (error: any) {
      console.error('Ошибка при тестовом парсинге:', error)
      throw error
    }
  }

  // Получить информацию о запросе парсинга
  async getParseRequest(requestId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/parser/requests/${requestId}`)
      return response.data
    } catch (error: any) {
      console.error('Ошибка при получении запроса парсинга:', error)
      throw error
    }
  }
}

export const parserApi = new ParserApi()
export default parserApi