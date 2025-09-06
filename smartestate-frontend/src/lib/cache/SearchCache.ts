import { ParsedProperty } from '../parsers/krishaParser'
import { PropertyFilters } from '@/types/PropertyFilters'

interface CacheEntry {
  properties: ParsedProperty[]
  timestamp: number
  filters: PropertyFilters
  pages: number
}

class SearchCache {
  private cache = new Map<string, CacheEntry>()
  private readonly ttl = 10 * 60 * 1000 // 10 минут кеш

  private generateKey(filters: PropertyFilters, pages: number): string {
    // Создаем уникальный ключ на основе фильтров
    const normalized = {
      ...filters,
      // Сортируем ключи для консистентности
      ...Object.keys(filters).sort().reduce((acc, key) => {
        acc[key] = filters[key as keyof PropertyFilters]
        return acc
      }, {} as any)
    }
    
    return `search_${JSON.stringify(normalized)}_pages_${pages}`
  }

  get(filters: PropertyFilters, pages: number): ParsedProperty[] | null {
    const key = this.generateKey(filters, pages)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Проверяем не истек ли кеш
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    console.log('Cache HIT for search:', key)
    return entry.properties
  }

  set(filters: PropertyFilters, pages: number, properties: ParsedProperty[]): void {
    const key = this.generateKey(filters, pages)
    const entry: CacheEntry = {
      properties,
      timestamp: Date.now(),
      filters,
      pages
    }

    this.cache.set(key, entry)
    console.log('Cache SET for search:', key, `(${properties.length} properties)`)

    // Очищаем старые записи если кеш слишком большой
    if (this.cache.size > 50) {
      this.cleanup()
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.ttl) {
        toDelete.push(key)
      }
    })

    toDelete.forEach(key => {
      this.cache.delete(key)
    })

    console.log(`Cache cleanup: removed ${toDelete.length} expired entries`)
  }

  clear(): void {
    this.cache.clear()
    console.log('Cache cleared')
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

export const searchCache = new SearchCache()

// Очистка старых записей каждые 5 минут
setInterval(() => {
  searchCache.cleanup()
}, 5 * 60 * 1000)