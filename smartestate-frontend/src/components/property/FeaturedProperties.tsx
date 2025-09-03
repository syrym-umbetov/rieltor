'use client'

import { Grid, Card, CardMedia, CardContent, Typography, Chip, Box, IconButton } from '@mui/material'
import { Favorite, FavoriteBorder, LocationOn, Bed, Square } from '@mui/icons-material'
import { useState } from 'react'
import { motion } from 'framer-motion'

const properties = [
    {
        id: 1,
        title: '3-комнатная квартира',
        price: 45000000,
        location: 'Алматы, Медеу',
        area: 85,
        rooms: 3,
        floor: '5/12',
        image: '/api/placeholder/400/300',
        badge: 'AI TOP'
    },
    {
        id: 2,
        title: '2-комнатная квартира',
        price: 32000000,
        location: 'Астана, Есиль',
        area: 65,
        rooms: 2,
        floor: '8/20',
        image: '/api/placeholder/400/300',
        badge: 'Новое'
    },
    {
        id: 3,
        title: '1-комнатная квартира',
        price: 250000,
        priceUnit: '/мес',
        location: 'Алматы, Ауэзов',
        area: 45,
        rooms: 1,
        floor: '3/9',
        image: '/api/placeholder/400/300',
        badge: 'Выгодно'
    }
]

export default function FeaturedProperties() {
    const [favorites, setFavorites] = useState<number[]>([])

    const toggleFavorite = (id: number) => {
        setFavorites(prev =>
            prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
        )
    }

    const formatPrice = (price: number, unit?: string) => {
        return `${(price / 1000000).toFixed(1)} млн ₸${unit || ''}`
    }

    return (
        <Grid container spacing={3}>
            {properties.map((property, index) => (
                <Grid item xs={12} md={4} key={property.id}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        whileHover={{ y: -5 }}
                    >
                        <Card sx={{ height: '100%', cursor: 'pointer', position: 'relative' }}>
                            {property.badge && (
                                <Chip
                                    label={property.badge}
                                    color="primary"
                                    size="small"
                                    sx={{
                                        position: 'absolute',
                                        top: 10,
                                        left: 10,
                                        zIndex: 1
                                    }}
                                />
                            )}

                            <IconButton
                                sx={{
                                    position: 'absolute',
                                    top: 10,
                                    right: 10,
                                    zIndex: 1,
                                    bgcolor: 'rgba(255,255,255,0.9)'
                                }}
                                onClick={() => toggleFavorite(property.id)}
                            >
                                {favorites.includes(property.id) ? (
                                    <Favorite color="error" />
                                ) : (
                                    <FavoriteBorder />
                                )}
                            </IconButton>

                            <CardMedia
                                component="div"
                                sx={{
                                    height: 200,
                                    bgcolor: 'grey.200',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '3rem'
                                }}
                            >
                                🏢
                            </CardMedia>

                            <CardContent>
                                <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
                                    {property.priceUnit
                                        ? `${property.price.toLocaleString()} ₸${property.priceUnit}`
                                        : formatPrice(property.price)
                                    }
                                </Typography>

                                <Typography variant="subtitle1" gutterBottom>
                                    {property.title}
                                </Typography>

                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'text.secondary' }}>
                                    <LocationOn fontSize="small" sx={{ mr: 0.5 }} />
                                    <Typography variant="body2">
                                        {property.location}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Bed fontSize="small" sx={{ mr: 0.5 }} />
                                        <Typography variant="caption">{property.rooms} комн</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Square fontSize="small" sx={{ mr: 0.5 }} />
                                        <Typography variant="caption">{property.area} м²</Typography>
                                    </Box>
                                    <Typography variant="caption">
                                        {property.floor} эт
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>
            ))}
        </Grid>
    )
}