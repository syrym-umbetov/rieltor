'use client'

import { useState, useCallback } from 'react'
import axios from 'axios'
import { useNotification } from './useNotification'

interface Property {
    id: string
    title: string
    description: string
    price: number
    property_type: string
    address: any
    coordinates: any
    features: any
    images: string[]
    area_sqm: number
    rooms: number
    floor: number
    total_floors: number
}

interface PropertyFilters {
    city?: string
    property_type?: string
    min_price?: number
    max_price?: number
    rooms?: number
    min_area?: number
    max_area?: number
}

export function useProperty() {
    const [properties, setProperties] = useState<Property[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { showNotification } = useNotification()

    const fetchProperties = useCallback(async (filters?: PropertyFilters) => {
        setLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams()
            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        params.append(key, value.toString())
                    }
                })
            }

            const response = await axios.get(`/api/properties?${params}`)
            setProperties(response.data)
        } catch (err) {
            setError('Ошибка загрузки объектов')
            showNotification('Ошибка загрузки объектов', 'error')
        } finally {
            setLoading(false)
        }
    }, [showNotification])

    const searchProperties = useCallback(async (query: string) => {
        setLoading(true)
        setError(null)

        try {
            const response = await axios.get(`/api/properties/search`, {
                params: { q: query }
            })
            setProperties(response.data)
        } catch (err) {
            setError('Ошибка поиска')
            showNotification('Ошибка поиска', 'error')
        } finally {
            setLoading(false)
        }
    }, [showNotification])

    const getRecommendations = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const token = localStorage.getItem('access_token')
            const response = await axios.get('/api/properties/recommendations', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setProperties(response.data)
        } catch (err) {
            setError('Ошибка получения рекомендаций')
            showNotification('Ошибка получения рекомендаций', 'error')
        } finally {
            setLoading(false)
        }
    }, [showNotification])

    const createProperty = useCallback(async (data: Partial<Property>) => {
        try {
            const token = localStorage.getItem('access_token')
            const response = await axios.post('/api/properties', data, {
                headers: { Authorization: `Bearer ${token}` }
            })
            showNotification('Объект успешно создан', 'success')
            return response.data
        } catch (err) {
            showNotification('Ошибка создания объекта', 'error')
            throw err
        }
    }, [showNotification])

    const updateProperty = useCallback(async (id: string, data: Partial<Property>) => {
        try {
            const token = localStorage.getItem('access_token')
            const response = await axios.put(`/api/properties/${id}`, data, {
                headers: { Authorization: `Bearer ${token}` }
            })
            showNotification('Объект успешно обновлен', 'success')
            return response.data
        } catch (err) {
            showNotification('Ошибка обновления объекта', 'error')
            throw err
        }
    }, [showNotification])

    const deleteProperty = useCallback(async (id: string) => {
        try {
            const token = localStorage.getItem('access_token')
            await axios.delete(`/api/properties/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            showNotification('Объект успешно удален', 'success')
            setProperties(prev => prev.filter(p => p.id !== id))
        } catch (err) {
            showNotification('Ошибка удаления объекта', 'error')
            throw err
        }
    }, [showNotification])

    return {
        properties,
        loading,
        error,
        fetchProperties,
        searchProperties,
        getRecommendations,
        createProperty,
        updateProperty,
        deleteProperty
    }
}