'use client'

import React, { useState } from 'react'
import { Box, Button, Typography, CircularProgress, Alert, Card, CardContent, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material'
import { parserApi } from '@/lib/api/parserApi'

interface TestResult {
  success: boolean
  properties: any[]
  count: number
  parserType: string
  cached: boolean
  requestId?: string
  error?: string
}

const BackendParserTest: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [city, setCity] = useState('Алматы')
  const [rooms, setRooms] = useState(2)
  const [maxPrice, setMaxPrice] = useState(50000000)

  const handleTestParse = async () => {
    setLoading(true)
    setResult(null)

    try {
      console.log('Запуск тестового парсинга через backend...')
      const response = await parserApi.testParse(city, rooms, maxPrice)
      
      setResult({
        success: true,
        properties: response.properties || [],
        count: response.count || 0,
        parserType: response.parserType || 'backend',
        cached: response.cached || false,
        requestId: response.requestId
      })
      
      console.log('Тестовый парсинг завершен:', response)
    } catch (error: any) {
      console.error('Ошибка тестового парсинга:', error)
      setResult({
        success: false,
        properties: [],
        count: 0,
        parserType: 'backend',
        cached: false,
        error: error.message || 'Неизвестная ошибка'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFullParse = async () => {
    setLoading(true)
    setResult(null)

    try {
      console.log('Запуск полного парсинга через backend...')
      
      const filters = {
        propertyType: 'apartment',
        city: city,
        rooms: rooms,
        priceMax: maxPrice,
        hasPhotos: true
      }

      const response = await parserApi.parseProperties(filters, 2)
      
      setResult({
        success: true,
        properties: response.properties || [],
        count: response.count || 0,
        parserType: response.parserType || 'backend',
        cached: response.cached || false,
        requestId: response.requestId
      })
      
      console.log('Полный парсинг завершен:', response)
    } catch (error: any) {
      console.error('Ошибка полного парсинга:', error)
      setResult({
        success: false,
        properties: [],
        count: 0,
        parserType: 'backend',
        cached: false,
        error: error.message || 'Неизвестная ошибка'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Тест Backend Парсера
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Тестирование парсинга недвижимости через backend API с использованием Selenium
        </Typography>

        <Box sx={{ mb: 3 }}>
          <FormControl sx={{ mr: 2, minWidth: 120 }}>
            <InputLabel>Город</InputLabel>
            <Select
              value={city}
              label="Город"
              onChange={(e) => setCity(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="Алматы">Алматы</MenuItem>
              <MenuItem value="Нур-Султан">Нур-Султан</MenuItem>
              <MenuItem value="Шымкент">Шымкент</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Комнат"
            type="number"
            value={rooms}
            onChange={(e) => setRooms(parseInt(e.target.value) || 2)}
            disabled={loading}
            sx={{ mr: 2, width: 100 }}
          />

          <TextField
            label="Макс. цена (тенге)"
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(parseInt(e.target.value) || 50000000)}
            disabled={loading}
            sx={{ width: 200 }}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            onClick={handleTestParse}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Быстрый тест'}
          </Button>

          <Button
            variant="outlined"
            onClick={handleFullParse}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Полный парсинг'}
          </Button>
        </Box>

        {result && (
          <Box sx={{ mt: 3 }}>
            {result.success ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                Парсинг успешен! Найдено {result.count} объектов
                {result.cached && ' (из кеша)'}
                {result.requestId && (
                  <Typography variant="caption" display="block">
                    ID запроса: {result.requestId}
                  </Typography>
                )}
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 2 }}>
                Ошибка парсинга: {result.error}
              </Alert>
            )}

            {result.success && result.properties.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Найденные объекты:
                </Typography>
                {result.properties.slice(0, 3).map((property, index) => (
                  <Card key={property.id || index} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" component="h3">
                        {property.title}
                      </Typography>
                      <Typography color="text.secondary" gutterBottom>
                        {property.address}
                      </Typography>
                      <Typography variant="body2">
                        Цена: {property.price.toLocaleString()} {property.currency}
                      </Typography>
                      {property.rooms && (
                        <Typography variant="body2">
                          Комнат: {property.rooms}
                        </Typography>
                      )}
                      {property.area && (
                        <Typography variant="body2">
                          Площадь: {property.area} м²
                        </Typography>
                      )}
                      {property.floor && property.totalFloors && (
                        <Typography variant="body2">
                          Этаж: {property.floor}/{property.totalFloors}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {result.properties.length > 3 && (
                  <Typography variant="body2" color="text.secondary">
                    И еще {result.properties.length - 3} объектов...
                  </Typography>
                )}
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
              Тип парсера: {result.parserType}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default BackendParserTest