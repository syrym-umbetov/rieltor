'use client'

import { useState } from 'react'
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  Paper,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material'
import {
  SmartToy,
  Search,
  Vrpano,
  Analytics,
  Description,
  CreditCard,
  TrendingUp,
  Home,
  Apartment,
  LocationOn
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import HeroSection from '@/components/home/HeroSection'
import StatsSection from '@/components/home/StatsSection'
import AIChat from '@/components/chat/AIChat'
import PropertySearch from '@/components/property/PropertySearch'
import FeaturedProperties from '@/components/property/FeaturedProperties'
import ServicesGrid from '@/components/home/ServicesGrid'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function HomePage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const router = useRouter()
  const { user } = useAuth()
  const [openChat, setOpenChat] = useState(true)

  return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Hero Section with AI Badge */}
        <HeroSection onStartChat={() => setOpenChat(true)} />

        {/* Stats Grid */}
        <Container maxWidth="lg" sx={{ mt: -8, position: 'relative', zIndex: 2 }}>
          <StatsSection />
        </Container>

        {/* Quick Search */}
        <Container maxWidth="lg" sx={{ mt: 6, mb: 4 }}>
          <PropertySearch />
        </Container>

        {/* AI Chat Interface */}
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
          >
            <Paper
                elevation={3}
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  background: theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
            >
              <AIChat open={openChat} onClose={() => setOpenChat(false)} />
            </Paper>
          </motion.div>
        </Container>

        {/* Featured Properties */}
        <Container maxWidth="lg" sx={{ mt: 6, mb: 4 }}>
          <Typography variant="h4" gutterBottom align="center" fontWeight="bold">
            {user ? `Рекомендации для ${user.full_name?.split(' ')[0]}` : 'Рекомендации AI'}
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            {user ? 'Подобрано специально для вас на основе ваших предпочтений' : 'Популярные предложения на рынке недвижимости'}
          </Typography>
          <FeaturedProperties />
        </Container>

        {/* Services Grid */}
        <Container maxWidth="lg" sx={{ mt: 8, mb: 6 }}>
          <Typography variant="h4" gutterBottom align="center" fontWeight="bold">
            Все возможности SmartEstate
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            AI-технологии для вашего успеха
          </Typography>
          <ServicesGrid />
        </Container>

        {/* AI Targeting Section */}
        <Container maxWidth="lg" sx={{ mt: 8, mb: 6 }}>
          <Paper
              elevation={3}
              sx={{
                p: 4,
                borderRadius: 4,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}
          >
            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="h3" gutterBottom fontWeight="bold">
                  🎯 AI Таргетолог
                </Typography>
                <Typography variant="h6" gutterBottom sx={{ opacity: 0.95 }}>
                  Автоматическое продвижение в соцсетях
                </Typography>
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body1" paragraph>
                    ✨ Что делает AI-таргетолог:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    <li>Создает рекламные тексты и креативы</li>
                    <li>Настраивает таргетинг на ЦА</li>
                    <li>Запускает A/B тестирование</li>
                    <li>Оптимизирует бюджет 24/7</li>
                  </Box>
                </Box>
                <Button
                    variant="contained"
                    size="large"
                    sx={{
                      mt: 3,
                      bgcolor: 'white',
                      color: 'primary.main',
                      '&:hover': { bgcolor: 'grey.100' }
                    }}
                    onClick={() => router.push('/targeting')}
                >
                  🚀 Запустить продвижение
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  {['Instagram', 'Facebook', 'TikTok', 'Google'].map((platform, index) => (
                      <Grid item xs={6} key={platform}>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                          <Paper
                              sx={{
                                p: 2,
                                textAlign: 'center',
                                bgcolor: 'rgba(255,255,255,0.2)',
                                backdropFilter: 'blur(10px)',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                '&:hover': {
                                  bgcolor: 'rgba(255,255,255,0.3)'
                                }
                              }}
                          >
                            <Typography variant="h4">
                              {['📷', '📘', '🎵', '🔍'][index]}
                            </Typography>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {platform}
                            </Typography>
                            <Typography variant="caption">
                              {['2.5M users', '3.8M users', '4.2M users', '8M+ searches'][index]}
                            </Typography>
                          </Paper>
                        </motion.div>
                      </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>
  )
}