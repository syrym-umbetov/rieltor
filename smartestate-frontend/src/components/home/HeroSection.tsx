'use client'

import { Box, Container, Typography, Button, Chip, Grid, useTheme, useMediaQuery, Skeleton } from '@mui/material'
import { motion } from 'framer-motion'
import { SmartToy, TrendingUp, Verified } from '@mui/icons-material'
import { useAuth } from '@/hooks/useAuth'

interface HeroSectionProps {
    onStartChat: () => void
}

export default function HeroSection({ onStartChat }: HeroSectionProps) {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const { user, loading } = useAuth()

    return (
        <Box
            sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                pt: { xs: 8, md: 12 },
                pb: { xs: 12, md: 16 },
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <Container maxWidth="lg">
                <Grid container spacing={4} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <Chip
                                icon={<Verified />}
                                label="AI Риелтор онлайн"
                                sx={{
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    mb: 2,
                                    '& .MuiChip-icon': { color: '#10b981' }
                                }}
                            />

                            {loading ? (
                                <Skeleton 
                                    variant="text" 
                                    width="80%" 
                                    height={80}
                                    sx={{ fontSize: { xs: '2rem', md: '3.5rem' }, mb: 2 }}
                                />
                            ) : (
                                <Typography
                                    variant="h1"
                                    sx={{
                                        fontSize: { xs: '2rem', md: '3.5rem' },
                                        fontWeight: 800,
                                        mb: 2,
                                        lineHeight: 1.1
                                    }}
                                >
                                    {user ? `Привет, ${user.full_name?.split(' ')[0]}!` : 'Найдем идеальную недвижимость за 3 минуты'}
                                </Typography>
                            )}

                            {loading ? (
                                <Skeleton 
                                    variant="text" 
                                    width="70%" 
                                    height={40}
                                    sx={{ mb: 4 }}
                                />
                            ) : (
                                <Typography
                                    variant="h6"
                                    sx={{
                                        mb: 4,
                                        opacity: 0.9,
                                        fontWeight: 400,
                                        fontSize: { xs: '1rem', md: '1.25rem' }
                                    }}
                                >
                                    {user ? 'Готов помочь найти идеальную недвижимость специально для вас' : 'AI анализирует 500,000+ объявлений со всех площадок Казахстана'}
                                </Typography>
                            )}

                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<SmartToy />}
                                    onClick={onStartChat}
                                    sx={{
                                        bgcolor: 'white',
                                        color: 'primary.main',
                                        px: 4,
                                        py: 1.5,
                                        fontSize: '1.1rem',
                                        '&:hover': {
                                            bgcolor: 'grey.100',
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                                        }
                                    }}
                                >
                                    Начать с AI
                                </Button>
                            </Box>
                        </motion.div>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            <Box
                                sx={{
                                    position: 'relative',
                                    height: { xs: 300, md: 400 },
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Box
                                    sx={{
                                        width: { xs: 250, md: 350 },
                                        height: { xs: 250, md: 350 },
                                        borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backdropFilter: 'blur(10px)',
                                        animation: 'pulse 3s infinite'
                                    }}
                                >
                                    <SmartToy sx={{ fontSize: { xs: 100, md: 150 }, opacity: 0.9 }} />
                                </Box>
                            </Box>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>

            <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255,255,255,0.3);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 20px rgba(255,255,255,0);
          }
        }
      `}</style>
        </Box>
    )
}