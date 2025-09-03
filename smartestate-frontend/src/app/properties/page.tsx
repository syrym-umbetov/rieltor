'use client'

import { useState, useEffect } from 'react'
import {
    Container,
    Grid,
    Paper,
    Typography,
    Box,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    Pagination,
    Skeleton,
    Drawer,
    IconButton,
    Slider,
    ToggleButtonGroup,
    ToggleButton,
    Card,
    CardMedia,
    CardContent,
    CardActions
} from '@mui/material'
import {
    FilterList,
    ViewModule,
    ViewList,
    Sort,
    LocationOn,
    Bed,
    Square,
    Favorite,
    FavoriteBorder,
    Share,
    Compare
} from '@mui/icons-material'
import { useProperty } from '@/hooks/useProperty'
import PropertySearch from '@/components/property/PropertySearch'

export default function PropertiesPage() {
    const { properties, loading, fetchProperties } = useProperty()
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [sortBy, setSortBy] = useState('price_asc')
    const [filterOpen, setFilterOpen] = useState(false)
    const [favorites, setFavorites] = useState<string[]>([])
    const [compareList, setCompareList] = useState<string[]>([])
    const [page, setPage] = useState(1)

    // Filters
    const [filters, setFilters] = useState({
        property_type: '',
        city: '',
        min_price: 0,
        max_price: 200000000,
        rooms: '',
        min_area: 0,
        max_area: 500
    })

    useEffect(() => {
        fetchProperties(filters)
    }, [filters, fetchProperties])

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const toggleFavorite = (id: string) => {
        setFavorites(prev =>
            prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
        )
    }

    const toggleCompare = (id: string) => {
        setCompareList(prev => {
            if (prev.includes(id)) {
                return prev.filter(cId => cId !== id)
            }
            if (prev.length >= 3) {
                alert('Можно сравнить максимум 3 объекта')
                return prev
            }
            return [...prev, id]
        })
    }

    const PropertyCard = ({ property }: any) => (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardMedia
                component="div"
                sx={{
                    height: 200,
                    bgcolor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '3rem',
                    position: 'relative'
                }}
            >
                🏢
                {property.badge && (
                    <Chip
                        label={property.badge}
                        color="primary"
                        size="small"
                        sx={{ position: 'absolute', top: 10, left: 10 }}
                    />
                )}
            </CardMedia>

            <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" color="primary" gutterBottom>
                    {property.price.toLocaleString()} ₸
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                    {property.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary' }}>
                    <LocationOn fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="body2">{property.address?.city}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Bed fontSize="small" sx={{ mr: 0.5 }} />
                        <Typography variant="caption">{property.rooms} комн</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Square fontSize="small" sx={{ mr: 0.5 }} />
                        <Typography variant="caption">{property.area_sqm} м²</Typography>
                    </Box>
                </Box>
            </CardContent>

            <CardActions>
                <IconButton onClick={() => toggleFavorite(property.id)}>
                    {favorites.includes(property.id) ? <Favorite color="error" /> : <FavoriteBorder />}
                </IconButton>
                <IconButton onClick={() => toggleCompare(property.id)}>
                    <Compare color={compareList.includes(property.id) ? 'primary' : 'inherit'} />
                </IconButton>
                <IconButton>
                    <Share />
                </IconButton>
                <Button size="small" sx={{ ml: 'auto' }}>
                    Подробнее
                </Button>
            </CardActions>
        </Card>
    )

    const FilterDrawer = () => (
        <Drawer anchor="right" open={filterOpen} onClose={() => setFilterOpen(false)}>
            <Box sx={{ width: 320, p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Фильтры
                </Typography>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Тип недвижимости</InputLabel>
                    <Select
                        value={filters.property_type}
                        label="Тип недвижимости"
                        onChange={(e) => handleFilterChange('property_type', e.target.value)}
                    >
                        <MenuItem value="">Все</MenuItem>
                        <MenuItem value="apartment">Квартира</MenuItem>
                        <MenuItem value="house">Дом</MenuItem>
                        <MenuItem value="office">Офис</MenuItem>
                        <MenuItem value="commercial">Коммерческая</MenuItem>
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Город</InputLabel>
                    <Select
                        value={filters.city}
                        label="Город"
                        onChange={(e) => handleFilterChange('city', e.target.value)}
                    >
                        <MenuItem value="">Все</MenuItem>
                        <MenuItem value="almaty">Алматы</MenuItem>
                        <MenuItem value="astana">Астана</MenuItem>
                        <MenuItem value="shymkent">Шымкент</MenuItem>
                    </Select>
                </FormControl>

                <Box sx={{ mb: 3 }}>
                    <Typography gutterBottom>
                        Цена: {filters.min_price.toLocaleString()} - {filters.max_price.toLocaleString()} ₸
                    </Typography>
                    <Slider
                        value={[filters.min_price, filters.max_price]}
                        onChange={(_, value) => {
                            const [min, max] = value as number[]
                            handleFilterChange('min_price', min)
                            handleFilterChange('max_price', max)
                        }}
                        valueLabelDisplay="auto"
                        min={0}
                        max={200000000}
                        step={1000000}
                    />
                </Box>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Количество комнат</InputLabel>
                    <Select
                        value={filters.rooms}
                        label="Количество комнат"
                        onChange={(e) => handleFilterChange('rooms', e.target.value)}
                    >
                        <MenuItem value="">Любое</MenuItem>
                        <MenuItem value="1">1</MenuItem>
                        <MenuItem value="2">2</MenuItem>
                        <MenuItem value="3">3</MenuItem>
                        <MenuItem value="4">4+</MenuItem>
                    </Select>
                </FormControl>

                <Box sx={{ mb: 3 }}>
                    <Typography gutterBottom>
                        Площадь: {filters.min_area} - {filters.max_area} м²
                    </Typography>
                    <Slider
                        value={[filters.min_area, filters.max_area]}
                        onChange={(_, value) => {
                            const [min, max] = value as number[]
                            handleFilterChange('min_area', min)
                            handleFilterChange('max_area', max)
                        }}
                        valueLabelDisplay="auto"
                        min={0}
                        max={500}
                    />
                </Box>

                <Button variant="contained" fullWidth onClick={() => setFilterOpen(false)}>
                    Применить фильтры
                </Button>

                <Button
                    variant="outlined"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => {
                        setFilters({
                            property_type: '',
                            city: '',
                            min_price: 0,
                            max_price: 200000000,
                            rooms: '',
                            min_area: 0,
                            max_area: 500
                        })
                    }}
                >
                    Сбросить
                </Button>
            </Box>
        </Drawer>
    )

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Каталог недвижимости
            </Typography>

            <PropertySearch />

            <Paper sx={{ p: 2, mt: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Button
                            variant="outlined"
                            startIcon={<FilterList />}
                            onClick={() => setFilterOpen(true)}
                        >
                            Фильтры
                        </Button>

                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Сортировка</InputLabel>
                            <Select
                                value={sortBy}
                                label="Сортировка"
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <MenuItem value="price_asc">Цена ↑</MenuItem>
                                <MenuItem value="price_desc">Цена ↓</MenuItem>
                                <MenuItem value="area_asc">Площадь ↑</MenuItem>
                                <MenuItem value="area_desc">Площадь ↓</MenuItem>
                                <MenuItem value="date_desc">Новые</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {compareList.length > 0 && (
                            <Chip
                                label={`Сравнить (${compareList.length})`}
                                color="primary"
                                onClick={() => {/* Navigate to compare page */}}
                            />
                        )}

                        <ToggleButtonGroup
                            value={viewMode}
                            exclusive
                            onChange={(_, value) => value && setViewMode(value)}
                            size="small"
                        >
                            <ToggleButton value="grid">
                                <ViewModule />
                            </ToggleButton>
                            <ToggleButton value="list">
                                <ViewList />
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Box>
            </Paper>

            {loading ? (
                <Grid container spacing={3}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Grid item xs={12} sm={6} md={4} key={i}>
                            <Skeleton variant="rectangular" height={350} />
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <>
                    <Grid container spacing={3}>
                        {properties.map((property) => (
                            <Grid item xs={12} sm={6} md={viewMode === 'grid' ? 4 : 12} key={property.id}>
                                <PropertyCard property={property} />
                            </Grid>
                        ))}
                    </Grid>

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <Pagination
                            count={10}
                            page={page}
                            onChange={(_, value) => setPage(value)}
                            color="primary"
                            size="large"
                        />
                    </Box>
                </>
            )}

            <FilterDrawer />
        </Container>
    )
}