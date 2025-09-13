'use client'

import React, { useState } from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    IconButton,
    Checkbox,
    CardMedia,
    Tooltip,
    Badge
} from '@mui/material'
import {
    LocationOn,
    OpenInNew,
    Favorite,
    FavoriteBorder,
    SquareFoot,
    Home,
    CheckCircle
} from '@mui/icons-material'

interface PropertyCardProps {
    property: {
        id?: string
        title: string
        price: string
        address: string
        image?: string
        link: string
        area?: string
        rooms?: number
        floor?: string
    }
    index: number
    selected?: boolean
    onSelect?: (id: string | number, selected: boolean) => void
    compact?: boolean
}

export default function PropertyCard({
    property,
    index,
    selected = false,
    onSelect,
    compact = true
}: PropertyCardProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [isFavorited, setIsFavorited] = useState(false)

    const handleSelect = () => {
        const id = property.id || index
        console.log(`🔄 PropertyCard: Переключение состояния для ${id}, текущее: ${selected}, новое: ${!selected}`)
        onSelect?.(id, !selected)
    }

    const handleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsFavorited(!isFavorited)
    }

    const formatPrice = (price: string): string => {
        // Если уже отформатировано, возвращаем как есть
        if (price.includes('млн') || price.includes('тыс')) {
            return price
        }

        const numMatch = price.match(/([\d\s,\.]+)/)
        if (numMatch) {
            const num = parseInt(numMatch[1].replace(/[\s,\.]/g, ''))
            if (num >= 1000000) {
                const millions = num / 1000000
                return millions >= 10 ? `${Math.round(millions)} млн ₸` : `${millions.toFixed(1)} млн ₸`
            } else if (num >= 1000) {
                return `${Math.round(num / 1000)} тыс ₸`
            }
            return `${num.toLocaleString('ru-RU')} ₸`
        }
        return price
    }

    return (
        <Card
            sx={{
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: selected ? 2 : 1,
                borderColor: selected ? 'primary.main' : 'divider',
                boxShadow: selected ? '0 8px 24px rgba(99, 102, 241, 0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                    borderColor: 'primary.light'
                },
                height: compact ? 160 : 200
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleSelect}
        >
            {/* Чекбокс */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '50%',
                    backdropFilter: 'blur(4px)',
                    opacity: isHovered || selected ? 1 : 0.7,
                    transition: 'opacity 0.3s ease'
                }}
            >
                <Checkbox
                    checked={selected}
                    onChange={handleSelect}
                    icon={
                        <Box
                            sx={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                border: 2,
                                borderColor: 'grey.400',
                                bgcolor: 'white'
                            }}
                        />
                    }
                    checkedIcon={
                        <CheckCircle
                            sx={{
                                color: 'primary.main',
                                fontSize: 24,
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                            }}
                        />
                    }
                    sx={{
                        p: 0.5,
                        '&:hover': {
                            bgcolor: 'transparent'
                        }
                    }}
                />
            </Box>

            {/* Номер объявления */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 2,
                    bgcolor: selected ? 'primary.main' : 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    borderRadius: 1,
                    px: 1,
                    py: 0.5,
                    minWidth: 24,
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    backdropFilter: 'blur(4px)',
                    transition: 'all 0.3s ease'
                }}
            >
                {index + 1}
            </Box>

            <Box sx={{ display: 'flex', height: '100%' }}>
                {/* Изображение */}
                {property.image && (
                    <Box sx={{ position: 'relative', width: compact ? 120 : 140, flexShrink: 0 }}>
                        <CardMedia
                            component="img"
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                filter: selected ? 'brightness(1.1)' : 'none',
                                transition: 'filter 0.3s ease'
                            }}
                            image={property.image}
                            alt={property.title}
                        />
                        {/* Overlay gradient */}
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '50%',
                                background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
                                opacity: isHovered ? 0.8 : 0.3,
                                transition: 'opacity 0.3s ease'
                            }}
                        />
                    </Box>
                )}

                {/* Контент */}
                <Box sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0 // Для корректного overflow
                }}>
                    <CardContent sx={{
                        p: compact ? 1.5 : 2,
                        pb: '12px !important',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Заголовок */}
                        <Typography
                            variant="subtitle2"
                            sx={{
                                fontWeight: 600,
                                fontSize: compact ? '0.85rem' : '0.95rem',
                                lineHeight: 1.2,
                                mb: 1,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                        >
                            {property.title}
                        </Typography>

                        {/* Цена */}
                        <Chip
                            label={formatPrice(property.price)}
                            color={selected ? 'primary' : 'default'}
                            size="small"
                            sx={{
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                height: 24,
                                alignSelf: 'flex-start',
                                mb: 1,
                                bgcolor: selected ? 'primary.main' : 'grey.100',
                                color: selected ? 'white' : 'text.primary',
                                transition: 'all 0.3s ease'
                            }}
                        />

                        {/* Дополнительная информация */}
                        {(property.rooms || property.area) && (
                            <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                                {property.rooms && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Home sx={{ fontSize: 12, color: 'text.secondary' }} />
                                        <Typography variant="caption" color="text.secondary">
                                            {property.rooms} комн
                                        </Typography>
                                    </Box>
                                )}
                                {property.area && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <SquareFoot sx={{ fontSize: 12, color: 'text.secondary' }} />
                                        <Typography variant="caption" color="text.secondary">
                                            {property.area} м²
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}

                        {/* Адрес */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flex: 1 }}>
                            <LocationOn sx={{ fontSize: 12, color: 'text.secondary', mr: 0.5, flexShrink: 0 }} />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    fontSize: '0.7rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {property.address}
                            </Typography>
                        </Box>

                        {/* Кнопки действий */}
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mt: 'auto'
                        }}>
                            <Tooltip title="Открыть объявление">
                                <IconButton
                                    size="small"
                                    component="a"
                                    href={property.link}
                                    target="_blank"
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{
                                        bgcolor: selected ? 'primary.light' : 'grey.100',
                                        color: selected ? 'white' : 'text.secondary',
                                        '&:hover': {
                                            bgcolor: 'primary.main',
                                            color: 'white',
                                            transform: 'scale(1.1)'
                                        },
                                        transition: 'all 0.2s ease',
                                        width: 28,
                                        height: 28
                                    }}
                                >
                                    <OpenInNew sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title={isFavorited ? "Убрать из избранного" : "Добавить в избранное"}>
                                <IconButton
                                    size="small"
                                    onClick={handleFavorite}
                                    sx={{
                                        color: isFavorited ? 'error.main' : 'text.secondary',
                                        '&:hover': {
                                            color: 'error.main',
                                            transform: 'scale(1.1)'
                                        },
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {isFavorited ?
                                        <Favorite sx={{ fontSize: 16 }} /> :
                                        <FavoriteBorder sx={{ fontSize: 16 }} />
                                    }
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </CardContent>
                </Box>
            </Box>

            {/* Анимированная граница при выборе */}
            {selected && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        border: '2px solid',
                        borderColor: 'primary.main',
                        borderRadius: 2,
                        pointerEvents: 'none',
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                            '0%': { opacity: 0.5 },
                            '50%': { opacity: 1 },
                            '100%': { opacity: 0.5 }
                        }
                    }}
                />
            )}
        </Card>
    )
}