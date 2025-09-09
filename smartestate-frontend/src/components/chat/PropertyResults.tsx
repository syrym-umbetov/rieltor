'use client'

import React from 'react'
import { 
    Box, 
    Card, 
    CardContent, 
    Typography, 
    Chip,
    Stack,
    Button,
    Grid,
    CardMedia,
    IconButton
} from '@mui/material'
import { 
    LocationOn, 
    Home,
    AttachMoney,
    OpenInNew,
    Favorite,
    FavoriteBorder,
    SquareFoot,
    Layers
} from '@mui/icons-material'
import ReactMarkdown from 'react-markdown'

interface PropertyData {
    title: string
    price: string
    address: string
    image: string
    link: string
    area?: string
    floor?: string
}

interface PropertyResultsProps {
    content: string
}

const parsePropertyData = (content: string): PropertyData[] => {
    const properties: PropertyData[] = []
    
    // Разбираем markdown на отдельные объекты недвижимости
    const sections = content.split('---').filter(section => section.trim())
    
    sections.forEach(section => {
        const lines = section.split('\n').filter(line => line.trim())
        let property: Partial<PropertyData> = {}
        
        lines.forEach(line => {
            const trimmedLine = line.trim()
            
            // Заголовок
            if (trimmedLine.startsWith('🏢 **') && trimmedLine.includes('**')) {
                property.title = trimmedLine.replace(/🏢\s*\*\*/, '').replace(/\*\*$/, '').trim()
            }
            
            // Цена
            if (trimmedLine.startsWith('💰 Цена:')) {
                property.price = trimmedLine.replace('💰 Цена:', '').trim()
            }
            
            // Адрес
            if (trimmedLine.startsWith('📍 Адрес:')) {
                property.address = trimmedLine.replace('📍 Адрес:', '').trim()
            }
            
            // Изображение
            if (trimmedLine.includes('![Фото') && trimmedLine.includes('](')) {
                const imageMatch = trimmedLine.match(/!\[.*?\]\((.*?)\)/)
                if (imageMatch) {
                    property.image = imageMatch[1]
                }
            }
            
            // Ссылка
            if (trimmedLine.includes('[Подробнее]') && trimmedLine.includes('](')) {
                const linkMatch = trimmedLine.match(/\[Подробнее\]\((.*?)\)/)
                if (linkMatch) {
                    property.link = linkMatch[1]
                }
            }
        })
        
        if (property.title && property.price && property.address) {
            properties.push(property as PropertyData)
        }
    })
    
    return properties
}

const formatPrice = (price: number | string): string => {
    // Если передано число, используем его напрямую
    let num: number
    if (typeof price === 'number') {
        num = price
    } else {
        // Если строка, пытаемся извлечь число
        const priceMatch = price.match(/([\d.,\s]+)/)
        if (priceMatch) {
            const numStr = priceMatch[1].replace(/[\s.,]/g, '').replace(/,/g, '')
            num = parseInt(numStr)
        } else {
            return price
        }
    }
    
    if (num >= 1000000) {
        const millions = num / 1000000
        if (millions >= 10) {
            return `${Math.round(millions)} млн ₸`
        } else {
            return `${millions.toFixed(1)} млн ₸`
        }
    } else if (num >= 1000) {
        return `${Math.round(num / 1000)} тыс ₸`
    }
    
    return `${num.toLocaleString('ru-RU')} ₸`
}

export default function PropertyResults({ content }: PropertyResultsProps) {
    const properties = parsePropertyData(content)
    
    // Если не удалось распарсить как недвижимость, показываем обычный markdown
    if (properties.length === 0) {
        return <ReactMarkdown>{content}</ReactMarkdown>
    }

    return (
        <Box sx={{ width: '100%' }}>
            {/* Заголовок */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.main', borderRadius: 2, color: 'white' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    🏠 Найденные объекты
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {properties.length} {properties.length === 1 ? 'объект' : properties.length < 5 ? 'объекта' : 'объектов'} недвижимости
                </Typography>
            </Box>

            {/* Список объектов */}
            <Stack spacing={2}>
                {properties.map((property, index) => (
                    <Card 
                        key={index}
                        sx={{ 
                            borderRadius: 3,
                            overflow: 'hidden',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                            }
                        }}
                    >
                        <Grid container>
                            {/* Изображение */}
                            {property.image && (
                                <Grid item xs={4}>
                                    <CardMedia
                                        component="img"
                                        sx={{
                                            width: '100%',
                                            height: 120,
                                            objectFit: 'cover'
                                        }}
                                        image={property.image}
                                        alt={property.title}
                                    />
                                </Grid>
                            )}
                            
                            {/* Контент */}
                            <Grid item xs={property.image ? 8 : 12}>
                                <CardContent sx={{ p: 2, pb: '12px !important' }}>
                                    {/* Заголовок и цена */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography 
                                            variant="subtitle1" 
                                            sx={{ 
                                                fontWeight: 600,
                                                fontSize: '0.95rem',
                                                lineHeight: 1.2,
                                                flex: 1,
                                                mr: 1
                                            }}
                                        >
                                            {property.title}
                                        </Typography>
                                        <Chip
                                            label={property.price}
                                            color="primary"
                                            size="small"
                                            sx={{ 
                                                fontWeight: 600,
                                                fontSize: '0.75rem'
                                            }}
                                        />
                                    </Box>
                                    
                                    {/* Адрес */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <LocationOn sx={{ fontSize: 14, color: 'text.secondary', mr: 0.5 }} />
                                        <Typography 
                                            variant="body2" 
                                            color="text.secondary"
                                            sx={{ fontSize: '0.8rem' }}
                                        >
                                            {property.address}
                                        </Typography>
                                    </Box>
                                    
                                    {/* Кнопки действий */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            endIcon={<OpenInNew sx={{ fontSize: 16 }} />}
                                            href={property.link}
                                            target="_blank"
                                            sx={{ 
                                                borderRadius: 2,
                                                textTransform: 'none',
                                                fontSize: '0.75rem',
                                                px: 1.5,
                                                py: 0.5
                                            }}
                                        >
                                            Подробнее
                                        </Button>
                                        
                                        <IconButton size="small" sx={{ color: 'text.secondary' }}>
                                            <FavoriteBorder sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Box>
                                </CardContent>
                            </Grid>
                        </Grid>
                    </Card>
                ))}
            </Stack>
            
            {/* Дополнительная информация */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                    💡 Хотите уточнить поиск или получить больше информации?
                </Typography>
            </Box>
        </Box>
    )
}