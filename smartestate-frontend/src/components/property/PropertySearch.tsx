'use client'

import { useState } from 'react'
import {
    Paper,
    TextField,
    Button,
    Grid,
    InputAdornment,
    Chip,
    Box,
    Typography,
    Autocomplete,
    Slider,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material'
import { Search, LocationOn, Home, AttachMoney } from '@mui/icons-material'

const cities = ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Тараз', 'Павлодар']
const propertyTypes = ['Квартира', 'Дом', 'Офис', 'Коммерческая', 'Земля']

export default function PropertySearch() {
    const [searchType, setSearchType] = useState<'buy' | 'rent'>('buy')
    const [city, setCity] = useState('')
    const [propertyType, setPropertyType] = useState('')
    const [priceRange, setPriceRange] = useState<number[]>([0, 100])
    const [rooms, setRooms] = useState<string>('')

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight="600" gutterBottom>
                    Умный поиск недвижимости
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    AI подберет лучшие варианты
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Chip
                    label="Купить"
                    onClick={() => setSearchType('buy')}
                    color={searchType === 'buy' ? 'primary' : 'default'}
                    variant={searchType === 'buy' ? 'filled' : 'outlined'}
                />
                <Chip
                    label="Арендовать"
                    onClick={() => setSearchType('rent')}
                    color={searchType === 'rent' ? 'primary' : 'default'}
                    variant={searchType === 'rent' ? 'filled' : 'outlined'}
                />
            </Box>

            <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                    <Autocomplete
                        options={cities}
                        value={city}
                        onChange={(_, value) => setCity(value || '')}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Город"
                                InputProps={{
                                    ...params.InputProps,
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LocationOn />
                                        </InputAdornment>
                                    )
                                }}
                            />
                        )}
                    />
                </Grid>

                <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                        <InputLabel>Тип недвижимости</InputLabel>
                        <Select
                            value={propertyType}
                            label="Тип недвижимости"
                            onChange={(e) => setPropertyType(e.target.value)}
                            startAdornment={
                                <InputAdornment position="start">
                                    <Home />
                                </InputAdornment>
                            }
                        >
                            {propertyTypes.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {type}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                        <InputLabel>Комнаты</InputLabel>
                        <Select
                            value={rooms}
                            label="Комнаты"
                            onChange={(e) => setRooms(e.target.value)}
                        >
                            <MenuItem value="1">1 комната</MenuItem>
                            <MenuItem value="2">2 комнаты</MenuItem>
                            <MenuItem value="3">3 комнаты</MenuItem>
                            <MenuItem value="4+">4+ комнат</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Box sx={{ px: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            Цена: {priceRange[0]} - {priceRange[1]} млн ₸
                        </Typography>
                        <Slider
                            value={priceRange}
                            onChange={(_, value) => setPriceRange(value as number[])}
                            valueLabelDisplay="auto"
                            min={0}
                            max={200}
                        />
                    </Box>
                </Grid>

                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        startIcon={<Search />}
                        sx={{ py: 1.5 }}
                    >
                        Найти с помощью AI
                    </Button>
                </Grid>
            </Grid>
        </Paper>
    )
}