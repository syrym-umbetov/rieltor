'use client'

import { Container, Typography, Box } from '@mui/material'
import BackendParserTest from '@/components/search/BackendParserTest'

export default function ParserTestPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box textAlign="center" mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          Тестирование Backend Парсера
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Проверка работы парсера недвижимости через backend API с использованием Selenium
        </Typography>
      </Box>

      <BackendParserTest />
      
      <Box mt={4} p={3} bgcolor="background.paper" borderRadius={1}>
        <Typography variant="h6" gutterBottom>
          О тестировании:
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • <strong>Быстрый тест:</strong> Использует GET endpoint /api/parser/test для быстрого тестирования
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • <strong>Полный парсинг:</strong> Использует POST endpoint /api/parser/properties с полными фильтрами
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • <strong>Backend:</strong> Go + Selenium WebDriver для парсинга krisha.kz
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • <strong>Требования:</strong> Для работы нужен Selenium WebDriver (Chrome/Firefox) на порту 4444
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • <strong>Fallback:</strong> При недоступности backend используется фронтенд парсер
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • <strong>Swagger:</strong> Документация API доступна на{' '}
          <a href="http://localhost:8080/swagger/index.html" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
            http://localhost:8080/swagger/index.html
          </a>
        </Typography>
      </Box>
    </Container>
  )
}