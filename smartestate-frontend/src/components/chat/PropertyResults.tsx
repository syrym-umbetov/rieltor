'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
    Box,
    Typography,
    Grid,
    Stack
} from '@mui/material'
import ReactMarkdown from 'react-markdown'
import PropertyCard from '../property/PropertyCard'
import PropertySelectionPanel from '../property/PropertySelectionPanel'
import { parsePropertyMarkdown, isPropertyContent, extractPropertyStats } from '@/utils/propertyParser'

interface PropertyData {
    id?: string
    title: string
    price: string
    address: string
    image: string
    link: string
    area?: string
    rooms?: number
    floor?: string
}

interface PropertyResultsProps {
    content: string
}


export default function PropertyResults({ content }: PropertyResultsProps) {
    // Проверяем, содержит ли контент информацию о недвижимости
    if (!isPropertyContent(content)) {
        return <ReactMarkdown>{content}</ReactMarkdown>
    }

    const properties = useMemo(() => parsePropertyMarkdown(content), [content])
    const stats = useMemo(() => extractPropertyStats(content), [content])
    const [selectedProperties, setSelectedProperties] = useState<{id: string | number, title: string, price: string}[]>([])
    const [selectionPanelExpanded, setSelectionPanelExpanded] = useState(false)

    // Если не удалось распарсить как недвижимость, показываем обычный markdown
    if (properties.length === 0) {
        return <ReactMarkdown>{content}</ReactMarkdown>
    }

    const handlePropertySelect = useCallback((id: string | number, selected: boolean) => {
        const property = properties.find(p => p.id === id || properties.indexOf(p) === id)
        if (!property) return

        setSelectedProperties(prev => {
            if (selected) {
                // Проверяем, что объект еще не выбран
                const alreadySelected = prev.some(p =>
                    p.id === id ||
                    (p.title === property.title && p.price === property.price)
                )

                if (alreadySelected) {
                    console.log('🚫 Объект уже выбран:', property.title)
                    return prev // Не добавляем дубликат
                }

                console.log('✅ Добавляем в избранное:', property.title)
                return [
                    ...prev,
                    {
                        id: id,
                        title: property.title,
                        price: property.price
                    }
                ]
            } else {
                console.log('❌ Убираем из избранного:', property.title)
                return prev.filter(p => p.id !== id)
            }
        })
    }, [properties])

    const handleClearAll = () => {
        setSelectedProperties([])
    }

    const handleRemoveProperty = (id: string | number) => {
        setSelectedProperties(prev => prev.filter(p => p.id !== id))
    }

    const isSelected = useCallback((id: string | number) => {
        return selectedProperties.some(p => p.id === id)
    }, [selectedProperties])

    return (
        <Box sx={{ width: '100%' }}>
            {/* Панель выбранных объектов */}
            <PropertySelectionPanel
                selectedProperties={selectedProperties}
                onClearAll={handleClearAll}
                onRemoveProperty={handleRemoveProperty}
                expanded={selectionPanelExpanded}
                onToggleExpand={() => setSelectionPanelExpanded(!selectionPanelExpanded)}
            />

            {/* Заголовок */}
            <Box sx={{ mb: 3, p: 3, bgcolor: 'primary.main', borderRadius: 3, color: 'white' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    🏠 Найденные объекты недвижимости
                    {stats?.location && (
                        <Typography component="span" variant="body2" sx={{ opacity: 0.8, ml: 1 }}>
                            • {stats.location}
                        </Typography>
                    )}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {stats?.totalFound || properties.length} {(stats?.totalFound || properties.length) === 1 ? 'объект' : (stats?.totalFound || properties.length) < 5 ? 'объекта' : 'объектов'} найдено
                    </Typography>
                    {stats?.withImages > 0 && (
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            📸 {stats.withImages} с фото
                        </Typography>
                    )}
                    {selectedProperties.length > 0 && (
                        <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600 }}>
                            ✅ Выбрано: {selectedProperties.length}
                        </Typography>
                    )}
                </Stack>
            </Box>

            {/* Сетка карточек */}
            <Grid container spacing={2}>
                {properties.map((property, index) => (
                    <Grid item xs={12} sm={6} md={4} key={property.id || index}>
                        <PropertyCard
                            property={property}
                            index={index}
                            selected={isSelected(property.id || index)}
                            onSelect={handlePropertySelect}
                            compact={true}
                        />
                    </Grid>
                ))}
            </Grid>

            {/* Дополнительная информация */}
            <Box sx={{
                mt: 3,
                p: 3,
                bgcolor: 'grey.50',
                borderRadius: 3,
                textAlign: 'center',
                border: '1px solid',
                borderColor: 'grey.200'
            }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                    💡 Используйте чекбоксы для выбора интересующих объектов
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Выберите несколько квартир для сравнения, получения отчета или отправки застройщику
                </Typography>
            </Box>
        </Box>
    )
}