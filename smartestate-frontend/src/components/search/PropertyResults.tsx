'use client'

import React from 'react'
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardMedia,
    CardContent,
    CardActions,
    Button,
    Chip,
    IconButton,
    Link,
    Skeleton,
    Alert,
    Divider
} from '@mui/material'
import {
    Home,
    LocationOn,
    SquareFoot,
    Layers,
    CalendarMonth,
    Phone,
    OpenInNew,
    AttachMoney,
    PhotoCamera
} from '@mui/icons-material'
import { ParsedProperty } from '@/lib/parsers/krishaParser'

interface PropertyResultsProps {
    properties: ParsedProperty[]
    loading?: boolean
    error?: string | null
}

export default function PropertyResults({ properties, loading, error }: PropertyResultsProps) {
    const formatPrice = (price: number, currency: string) => {
        if (price === 0) return 'Цена не указана'
        
        if (price >= 1000000) {
            const millions = price / 1000000
            if (millions >= 10) {
                return `${Math.round(millions)} млн ${currency}`
            } else {
                return `${millions.toFixed(1)} млн ${currency}`
            }
        } else if (price >= 1000) {
            return `${Math.round(price / 1000)} тыс ${currency}`
        }
        
        return new Intl.NumberFormat('ru-KZ').format(price) + ' ' + currency
    }

    const formatArea = (area: number | null) => {
        return area ? `${area} м²` : 'Не указано'
    }

    const PropertyCard = ({ property }: { property: ParsedProperty }) => (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {property.images.length > 0 ? (
                <CardMedia
                    component="img"
                    height="200"
                    image={property.images[0]}
                    alt={property.title}
                    sx={{ objectFit: 'cover' }}
                />
            ) : (
                <Box
                    sx={{
                        height: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'grey.200',
                        color: 'grey.500'
                    }}
                >
                    <PhotoCamera sx={{ fontSize: 40, mr: 1 }} />
                    <Typography>Фото отсутствует</Typography>
                </Box>
            )}
            
            <CardContent sx={{ flex: 1 }}>
                <Typography gutterBottom variant="h6" component="h3" sx={{ 
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                }}>
                    {property.title}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'success.main' }}>
                    <AttachMoney sx={{ fontSize: 20, mr: 0.5 }} />
                    <Typography variant="h6" color="success.main" fontWeight="600">
                        {formatPrice(property.price, property.currency)}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                    <LocationOn sx={{ fontSize: 16, mr: 0.5, mt: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                    }}>
                        {property.address}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {property.rooms && (
                        <Chip
                            size="small"
                            icon={<Home />}
                            label={`${property.rooms}-комн`}
                            color="primary"
                            variant="outlined"
                        />
                    )}
                    
                    {property.area && (
                        <Chip
                            size="small"
                            icon={<SquareFoot />}
                            label={formatArea(property.area)}
                            color="default"
                            variant="outlined"
                        />
                    )}
                    
                    {property.floor && property.totalFloors && (
                        <Chip
                            size="small"
                            icon={<Layers />}
                            label={`${property.floor}/${property.totalFloors} эт`}
                            color="default"
                            variant="outlined"
                        />
                    )}

                    {property.buildYear && (
                        <Chip
                            size="small"
                            icon={<CalendarMonth />}
                            label={property.buildYear.toString()}
                            color="default"
                            variant="outlined"
                        />
                    )}

                    {property.isNewBuilding && (
                        <Chip
                            size="small"
                            label="Новостройка"
                            color="success"
                            variant="filled"
                        />
                    )}
                </Box>

                {property.residentialComplex && (
                    <Typography variant="caption" color="primary" sx={{ 
                        display: 'block',
                        fontWeight: 500,
                        mb: 1
                    }}>
                        ЖК: {property.residentialComplex}
                    </Typography>
                )}

                {property.description && property.description !== property.title && (
                    <Typography variant="body2" color="text.secondary" sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical'
                    }}>
                        {property.description}
                    </Typography>
                )}
            </CardContent>

            <Divider />
            <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                {property.phone && (
                    <Button
                        size="small"
                        startIcon={<Phone />}
                        href={`tel:${property.phone}`}
                        color="primary"
                    >
                        Позвонить
                    </Button>
                )}
                
                <Button
                    size="small"
                    endIcon={<OpenInNew />}
                    href={property.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                >
                    Подробнее
                </Button>
            </CardActions>
        </Card>
    )

    const LoadingSkeleton = () => (
        <Card>
            <Skeleton variant="rectangular" height={200} />
            <CardContent>
                <Skeleton variant="text" sx={{ fontSize: '1.25rem', mb: 1 }} />
                <Skeleton variant="text" width="60%" sx={{ mb: 1 }} />
                <Skeleton variant="text" width="80%" sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Skeleton variant="rounded" width={60} height={24} />
                    <Skeleton variant="rounded" width={70} height={24} />
                    <Skeleton variant="rounded" width={80} height={24} />
                </Box>
            </CardContent>
            <CardActions>
                <Skeleton variant="rounded" width={100} height={32} />
                <Skeleton variant="rounded" width={120} height={32} />
            </CardActions>
        </Card>
    )

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Ошибка при поиске недвижимости
                </Typography>
                <Typography variant="body2">
                    {error}
                </Typography>
            </Alert>
        )
    }

    return (
        <Box>
            {/* Заголовок результатов */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    {loading ? 'Поиск недвижимости...' : `Найдено: ${properties.length} объектов`}
                </Typography>
                
                {!loading && properties.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                        Результаты поиска с Krisha.kz
                    </Typography>
                )}
            </Box>

            {/* Сетка результатов */}
            <Grid container spacing={3}>
                {loading ? (
                    // Скелетоны загрузки
                    [...Array(6)].map((_, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <LoadingSkeleton />
                        </Grid>
                    ))
                ) : properties.length > 0 ? (
                    // Реальные результаты
                    properties.map((property) => (
                        <Grid item xs={12} sm={6} md={4} key={property.id}>
                            <PropertyCard property={property} />
                        </Grid>
                    ))
                ) : (
                    // Пустые результаты
                    <Grid item xs={12}>
                        <Paper sx={{ p: 6, textAlign: 'center' }}>
                            <Home sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Объекты не найдены
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Попробуйте изменить параметры поиска или воспользуйтесь AI для уточнения требований
                            </Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    )
}