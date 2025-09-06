'use client'

import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

interface Property {
    id: string
    title: string
    description: string
    price: number
    currency: string
    property_type: string
    area: number
    rooms: number
    bedrooms: number
    bathrooms: number
    floor: number
    total_floors: number
    address: string
    city: string
    district: string
    latitude?: number
    longitude?: number
    images: string[]
    amenities: string[]
    contact_phone: string
    contact_email: string
    agent_name?: string
    is_featured: boolean
    status: 'active' | 'sold' | 'rented'
    created_at: string
    updated_at: string
}

interface PropertyFilters {
    property_type?: string
    min_price?: number
    max_price?: number
    min_area?: number
    max_area?: number
    rooms?: number
    city?: string
    district?: string
}

interface UsePropertyReturn {
    properties: Property[]
    loading: boolean
    error: string | null
    fetchProperties: (filters?: PropertyFilters) => Promise<void>
    searchProperties: (query: string, filters?: PropertyFilters) => Promise<void>
}

export function useProperty(): UsePropertyReturn {
    const [properties, setProperties] = useState<Property[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchProperties = async (filters?: PropertyFilters) => {
        setLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams()
            
            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        params.append(key, value.toString())
                    }
                })
            }

            const response = await fetch(`${API_URL}/properties?${params.toString()}`, {
                headers: {
                    'Accept': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error('Ошибка загрузки объектов недвижимости')
            }

            const data = await response.json()
            setProperties(data.properties || data || [])
        } catch (err: any) {
            console.error('Property fetch error:', err)
            setError(err.message || 'Ошибка загрузки объектов недвижимости')
            // Устанавливаем mock данные для разработки
            setProperties(getMockProperties())
        } finally {
            setLoading(false)
        }
    }

    const searchProperties = async (query: string, filters?: PropertyFilters) => {
        setLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams()
            params.append('q', query)
            
            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        params.append(key, value.toString())
                    }
                })
            }

            const response = await fetch(`${API_URL}/properties/search?${params.toString()}`, {
                headers: {
                    'Accept': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error('Ошибка поиска объектов недвижимости')
            }

            const data = await response.json()
            setProperties(data.properties || data || [])
        } catch (err: any) {
            console.error('Property search error:', err)
            setError(err.message || 'Ошибка поиска объектов недвижимости')
            // Устанавливаем отфильтрованные mock данные для разработки
            const mockData = getMockProperties()
            const filteredData = mockData.filter(property => 
                property.title.toLowerCase().includes(query.toLowerCase()) ||
                property.description.toLowerCase().includes(query.toLowerCase()) ||
                property.address.toLowerCase().includes(query.toLowerCase())
            )
            setProperties(filteredData)
        } finally {
            setLoading(false)
        }
    }

    // Загружаем свойства при первом использовании
    useEffect(() => {
        fetchProperties()
    }, [])

    return {
        properties,
        loading,
        error,
        fetchProperties,
        searchProperties
    }
}

// Mock данные для разработки
function getMockProperties(): Property[] {
    return [
        {
            id: '1',
            title: '3-комнатная квартира в центре Алматы',
            description: 'Просторная квартира в престижном районе с видом на горы. Евроремонт, все удобства.',
            price: 80000000,
            currency: 'KZT',
            property_type: 'apartment',
            area: 120,
            rooms: 3,
            bedrooms: 2,
            bathrooms: 2,
            floor: 8,
            total_floors: 12,
            address: 'пр. Абая, 150',
            city: 'Алматы',
            district: 'Медеуский',
            images: ['/images/property1.jpg'],
            amenities: ['parking', 'elevator', 'balcony', 'internet'],
            contact_phone: '+7 777 123 4567',
            contact_email: 'agent1@example.com',
            agent_name: 'Айгуль Сманова',
            is_featured: true,
            status: 'active',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z'
        },
        {
            id: '2',
            title: 'Коттедж в Алматинской области',
            description: 'Уютный коттедж с участком. Идеально для семейного отдыха.',
            price: 150000000,
            currency: 'KZT',
            property_type: 'house',
            area: 250,
            rooms: 5,
            bedrooms: 4,
            bathrooms: 3,
            floor: 1,
            total_floors: 2,
            address: 'коттеджный поселок "Алатау"',
            city: 'Алматинская область',
            district: 'Талгарский',
            images: ['/images/property2.jpg'],
            amenities: ['garden', 'garage', 'fireplace', 'security'],
            contact_phone: '+7 777 234 5678',
            contact_email: 'agent2@example.com',
            agent_name: 'Ермек Касымов',
            is_featured: false,
            status: 'active',
            created_at: '2024-01-10T14:30:00Z',
            updated_at: '2024-01-10T14:30:00Z'
        },
        {
            id: '3',
            title: 'Студия в новостройке',
            description: 'Современная студия в новом жилом комплексе. Готова к заселению.',
            price: 25000000,
            currency: 'KZT',
            property_type: 'studio',
            area: 45,
            rooms: 1,
            bedrooms: 1,
            bathrooms: 1,
            floor: 15,
            total_floors: 20,
            address: 'ЖК "Алтын Орда", корпус 3',
            city: 'Алматы',
            district: 'Бостандыкский',
            images: ['/images/property3.jpg'],
            amenities: ['elevator', 'security', 'gym', 'parking'],
            contact_phone: '+7 777 345 6789',
            contact_email: 'agent3@example.com',
            agent_name: 'Динара Нурланова',
            is_featured: true,
            status: 'active',
            created_at: '2024-01-20T09:15:00Z',
            updated_at: '2024-01-20T09:15:00Z'
        }
    ]
}