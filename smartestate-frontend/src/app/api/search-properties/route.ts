import { NextRequest, NextResponse } from 'next/server'
import { KrishaParser, ParsedProperty } from '@/lib/parsers/krishaParser'
import { KrishaHttpParser } from '@/lib/parsers/krishaHttpParser'
import { PropertyFilters } from '@/types/PropertyFilters'
import { searchCache } from '@/lib/cache/SearchCache'
import { parserApi } from '@/lib/api/parserApi'

export async function POST(request: NextRequest) {
  try {
    const { filters, pages = 2, withDetails = false, useSelenium = false, useBackend = true } = await request.json()

    console.log('Starting property search with filters:', filters)

    // Проверяем фильтры
    if (!filters || typeof filters !== 'object') {
      return NextResponse.json({ 
        error: 'Invalid filters provided' 
      }, { status: 400 })
    }

    let properties: ParsedProperty[] = []
    let cachedResults: ParsedProperty[] | null = null

    // Если используем backend API
    if (useBackend) {
      try {
        console.log('Using backend parser API')
        const backendResponse = await parserApi.parseProperties(filters, pages)
        
        return NextResponse.json(backendResponse)
      } catch (error: any) {
        console.error('Backend parser failed, falling back to frontend parser:', error)
        // Если backend не работает, используем фронтенд парсер как fallback
      }
    }

    // Fallback к фронтенд парсеру
    if (useSelenium) {
      // Проверяем кеш сначала
      cachedResults = searchCache.get(filters as PropertyFilters, pages)
      if (cachedResults) {
        properties = cachedResults
        console.log(`Using cached results: ${properties.length} properties`)
      } else {
        // Используем Selenium парсер (медленнее, но точнее)
        const seleniumParser = new KrishaParser()
        
        try {
          await seleniumParser.init()
          console.log('Selenium parser initialized')
          properties = await seleniumParser.searchProperties(filters as PropertyFilters, pages)
          console.log(`Selenium found ${properties.length} properties`)
          
          // Кешируем результаты
          searchCache.set(filters as PropertyFilters, pages, properties)
        } finally {
          await seleniumParser.close()
          console.log('Selenium parser closed')
        }
      }
    } else {
      // Используем HTTP парсер (быстрее, mock данные для демо)
      const httpParser = new KrishaHttpParser()
      properties = await httpParser.searchProperties(filters as PropertyFilters, pages)
      console.log(`HTTP parser found ${properties.length} properties`)
    }

    return NextResponse.json({ 
      success: true,
      properties,
      count: properties.length,
      searchParams: filters,
      parserType: useSelenium ? 'selenium' : 'http',
      cached: cachedResults !== null
    })

  } catch (error: any) {
    console.error('Property search error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to search properties',
      properties: [],
      count: 0
    }, { status: 500 })
  }
}

// Метод GET для тестирования
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const testSearch = url.searchParams.get('test')
    
    if (testSearch === 'true') {
      // Тестовый поиск с базовыми фильтрами
      const testFilters: PropertyFilters = {
        propertyType: 'apartment',
        city: 'Алматы',
        rooms: 2,
        priceMax: 50000000, // 50 млн тенге
        hasPhotos: true
      }

      // Используем HTTP парсер для быстрого тестирования
      const httpParser = new KrishaHttpParser()
      const properties = await httpParser.searchProperties(testFilters, 1)
      
      return NextResponse.json({ 
        success: true,
        message: 'Test search completed (HTTP parser)',
        properties: properties.slice(0, 3), // Только первые 3 для теста
        count: properties.length,
        testFilters,
        parserType: 'http'
      })
    }

    return NextResponse.json({ 
      message: 'Property search API',
      endpoints: {
        'POST /api/search-properties': 'Search properties with filters',
        'GET /api/search-properties?test=true': 'Test search'
      }
    })

  } catch (error: any) {
    console.error('Test search error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Test search failed'
    }, { status: 500 })
  }
}