'use client'

import React, { useState } from 'react'
import {
    Box,
    Paper,
    Typography,
    Chip,
    Grid,
    Divider,
    Alert,
    LinearProgress,
    Stack,
    Tooltip,
    Button,
    CircularProgress
} from '@mui/material'
import {
    Home,
    PhotoCamera,
    Construction,
    Person,
    Business,
    CalendarMonth,
    Layers,
    SquareFoot,
    Kitchen,
    TrendingUp,
    LocationOn,
    AttachMoney,
    Search
} from '@mui/icons-material'
import { PropertyFilters, PropertyFilterExtraction } from '@/types/PropertyFilters'
import { ParsedProperty } from '@/lib/parsers/krishaParser'
import PropertyResults from '../search/PropertyResults'

interface PropertyFiltersDisplayProps {
    extraction: PropertyFilterExtraction | null
    loading?: boolean
}

const PropertyTypeLabels = {
    apartment: 'Квартира',
    house: 'Дом',
    commercial: 'Коммерческая'
}

const BuildingTypeLabels = {
    any: 'Не важно',
    brick: 'Кирпичный',
    monolith: 'Монолитный', 
    panel: 'Панельный',
    other: 'Иной'
}

const SellerTypeLabels = {
    owner: 'От собственника',
    agent: 'От агента',
    developer: 'От застройщика'
}

export default function PropertyFiltersDisplay({ extraction, loading }: PropertyFiltersDisplayProps) {
    const [searchResults, setSearchResults] = useState<ParsedProperty[]>([])
    const [searching, setSearching] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)

    const handleSearch = async () => {
        if (!extraction?.filters) return

        setSearching(true)
        setSearchError(null)
        
        try {
            const response = await fetch('/api/search-properties', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filters: extraction.filters,
                    pages: 1, // Уменьшили для быстрой демонстрации
                    withDetails: false,
                    useSelenium: true // Включаем Selenium для настоящих данных
                }),
            })

            const data = await response.json()
            
            if (data.success) {
                setSearchResults(data.properties)
            } else {
                setSearchError(data.error || 'Ошибка при поиске')
            }
        } catch (error) {
            console.error('Search error:', error)
            setSearchError('Не удалось выполнить поиск. Проверьте подключение.')
        } finally {
            setSearching(false)
        }
    }
    if (loading) {
        return (
            <Paper sx={{ p: 3, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    🔍 Анализируем ваши предпочтения...
                </Typography>
                <LinearProgress />
            </Paper>
        )
    }

    if (!extraction) {
        return null
    }

    const { filters, confidence, extractedFrom, needsClarification } = extraction

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ru-KZ').format(price) + ' ₸'
    }

    const formatArea = (area: number) => {
        return area + ' м²'
    }

    const getConfidenceColor = (conf: number) => {
        if (conf >= 0.8) return 'success'
        if (conf >= 0.5) return 'warning'
        return 'error'
    }

    const hasAnyFilters = Object.keys(filters).some(key => 
        filters[key as keyof PropertyFilters] !== null && 
        filters[key as keyof PropertyFilters] !== undefined
    )

    if (!hasAnyFilters && needsClarification.length === 0) {
        return null
    }

    return (
        <>
        <Paper sx={{ p: 3, mb: 2, border: '2px solid', borderColor: 'primary.main' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <TrendingUp color="primary" />
                <Typography variant="h6">
                    Извлеченные фильтры поиска
                </Typography>
                <Chip 
                    label={`Уверенность: ${Math.round(confidence * 100)}%`}
                    color={getConfidenceColor(confidence)}
                    size="small"
                />
            </Box>

            {hasAnyFilters && (
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    {/* Основные параметры */}
                    {filters.propertyType && (
                        <Grid item xs={6} sm={4}>
                            <Chip
                                icon={<Home />}
                                label={`Тип: ${PropertyTypeLabels[filters.propertyType]}`}
                                color="primary"
                                variant="outlined"
                            />
                        </Grid>
                    )}

                    {filters.rooms && (
                        <Grid item xs={6} sm={4}>
                            <Chip
                                icon={<Layers />}
                                label={`${filters.rooms}-комн`}
                                color="primary"
                                variant="outlined"
                            />
                        </Grid>
                    )}

                    {(filters.priceMin || filters.priceMax) && (
                        <Grid item xs={12} sm={8}>
                            <Chip
                                icon={<AttachMoney />}
                                label={`Цена: ${filters.priceMin ? formatPrice(filters.priceMin) : '0'} - ${filters.priceMax ? formatPrice(filters.priceMax) : '∞'}`}
                                color="secondary"
                                variant="outlined"
                            />
                        </Grid>
                    )}

                    {(filters.city || filters.district) && (
                        <Grid item xs={12} sm={6}>
                            <Chip
                                icon={<LocationOn />}
                                label={`${filters.city || ''}${filters.district ? `, ${filters.district}` : ''}`}
                                color="info"
                                variant="outlined"
                            />
                        </Grid>
                    )}

                    {/* Дополнительные фильтры */}
                    {filters.hasPhotos && (
                        <Grid item xs={6} sm={3}>
                            <Chip
                                icon={<PhotoCamera />}
                                label="С фото"
                                color="success"
                                size="small"
                            />
                        </Grid>
                    )}

                    {filters.isNewBuilding && (
                        <Grid item xs={6} sm={3}>
                            <Chip
                                icon={<Construction />}
                                label="Новостройка"
                                color="success"
                                size="small"
                            />
                        </Grid>
                    )}

                    {filters.sellerType && (
                        <Grid item xs={12} sm={6}>
                            <Chip
                                icon={filters.sellerType === 'owner' ? <Person /> : <Business />}
                                label={SellerTypeLabels[filters.sellerType]}
                                color="default"
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                    )}

                    {filters.buildingType && filters.buildingType !== 'any' && (
                        <Grid item xs={12} sm={6}>
                            <Chip
                                icon={<Home />}
                                label={`Тип дома: ${BuildingTypeLabels[filters.buildingType]}`}
                                color="default"
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                    )}

                    {(filters.buildYearFrom || filters.buildYearTo) && (
                        <Grid item xs={12} sm={6}>
                            <Chip
                                icon={<CalendarMonth />}
                                label={`Год: ${filters.buildYearFrom || ''}${filters.buildYearTo ? `-${filters.buildYearTo}` : '+'}`}
                                color="default"
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                    )}

                    {(filters.floorFrom || filters.floorTo) && (
                        <Grid item xs={12} sm={6}>
                            <Chip
                                icon={<Layers />}
                                label={`Этаж: ${filters.floorFrom || '1'}-${filters.floorTo || '∞'}`}
                                color="default"
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                    )}

                    {(filters.totalAreaFrom || filters.totalAreaTo) && (
                        <Grid item xs={12} sm={6}>
                            <Chip
                                icon={<SquareFoot />}
                                label={`Площадь: ${filters.totalAreaFrom ? formatArea(filters.totalAreaFrom) : '0'}-${filters.totalAreaTo ? formatArea(filters.totalAreaTo) : '∞'}`}
                                color="default"
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                    )}

                    {(filters.kitchenAreaFrom || filters.kitchenAreaTo) && (
                        <Grid item xs={12} sm={6}>
                            <Chip
                                icon={<Kitchen />}
                                label={`Кухня: ${filters.kitchenAreaFrom ? formatArea(filters.kitchenAreaFrom) : '0'}-${filters.kitchenAreaTo ? formatArea(filters.kitchenAreaTo) : '∞'}`}
                                color="default"
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                    )}

                    {filters.notFirstFloor && (
                        <Grid item xs={6} sm={4}>
                            <Chip
                                label="Не первый этаж"
                                color="warning"
                                size="small"
                            />
                        </Grid>
                    )}

                    {filters.notLastFloor && (
                        <Grid item xs={6} sm={4}>
                            <Chip
                                label="Не последний этаж"
                                color="warning"
                                size="small"
                            />
                        </Grid>
                    )}

                    {filters.residentialComplex && (
                        <Grid item xs={12}>
                            <Chip
                                icon={<Business />}
                                label={`ЖК: ${filters.residentialComplex}`}
                                color="info"
                                variant="outlined"
                            />
                        </Grid>
                    )}
                </Grid>
            )}

            {extractedFrom.length > 0 && (
                <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                        Извлечено из фраз:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                        {extractedFrom.map((phrase, index) => (
                            <Tooltip key={index} title={phrase} arrow>
                                <Chip
                                    label={phrase.length > 30 ? phrase.substring(0, 30) + '...' : phrase}
                                    size="small"
                                    variant="outlined"
                                    color="default"
                                />
                            </Tooltip>
                        ))}
                    </Stack>
                </>
            )}

            {needsClarification.length > 0 && (
                <>
                    <Divider sx={{ my: 2 }} />
                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Требует уточнения:
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {needsClarification.map((item, index) => (
                                <li key={index}>{item}</li>
                            ))}
                        </ul>
                    </Alert>
                </>
            )}

            {/* Кнопка поиска */}
            {hasAnyFilters && (
                <>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={searching ? <CircularProgress size={20} /> : <Search />}
                            onClick={handleSearch}
                            disabled={searching}
                            sx={{ 
                                minWidth: 200,
                                py: 1.5,
                                fontSize: '1.1rem',
                                fontWeight: 600
                            }}
                        >
                            {searching ? 'Поиск с Selenium...' : 'Найти недвижимость (Selenium)'}
                        </Button>
                    </Box>
                </>
            )}
        </Paper>

        {/* Результаты поиска */}
        {(searching || searchResults.length > 0 || searchError) && (
            <Box sx={{ mt: 3 }}>
                <PropertyResults 
                    properties={searchResults}
                    loading={searching}
                    error={searchError}
                />
            </Box>
        )}
    </>
    )
}