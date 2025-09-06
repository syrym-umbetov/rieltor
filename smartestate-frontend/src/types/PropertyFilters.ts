export interface PropertyFilters {
  // Базовые фильтры
  propertyType?: 'apartment' | 'house' | 'commercial' | null
  rooms?: number | null
  priceMin?: number | null
  priceMax?: number | null
  city?: string | null
  district?: string | null

  // Новые фильтры
  hasPhotos?: boolean | null
  isNewBuilding?: boolean | null
  sellerType?: 'owner' | 'agent' | 'developer' | null
  
  buildingType?: 'any' | 'brick' | 'monolith' | 'panel' | 'other' | null
  
  buildYearFrom?: number | null
  buildYearTo?: number | null
  
  residentialComplex?: string | null
  
  floorFrom?: number | null
  floorTo?: number | null
  notLastFloor?: boolean | null
  notFirstFloor?: boolean | null
  
  totalFloorsFrom?: number | null
  totalFloorsTo?: number | null
  
  totalAreaFrom?: number | null
  totalAreaTo?: number | null
  
  kitchenAreaFrom?: number | null
  kitchenAreaTo?: number | null
}

export interface PropertyFilterExtraction {
  filters: PropertyFilters
  confidence: number // 0-1, насколько AI уверен в извлеченных фильтрах
  extractedFrom: string[] // Фразы из которых извлечены фильтры
  needsClarification: string[] // Что нужно уточнить у клиента
}