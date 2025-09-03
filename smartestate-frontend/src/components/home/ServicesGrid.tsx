'use client'

import { Grid, Paper, Typography, Box } from '@mui/material'
import { motion } from 'framer-motion'
import {
    SmartToy,
    Search,
    Vrpano,
    Analytics,
    Description,
    CreditCard
} from '@mui/icons-material'

const services = [
    {
        icon: <SmartToy />,
        title: 'AI Риелтор',
        description: 'Персональный 24/7',
        color: '#6366f1'
    },
    {
        icon: <Search />,
        title: 'Умный поиск',
        description: '500K+ объектов',
        color: '#10b981'
    },
    {
        icon: <Vrpano />,
        title: 'VR туры',
        description: 'Онлайн просмотры',
        color: '#f59e0b'
    },
    {
        icon: <Analytics />,
        title: 'Аналитика',
        description: 'Прогноз цен',
        color: '#ef4444'
    },
    {
        icon: <Description />,
        title: 'Документы',
        description: 'Автопроверка',
        color: '#8b5cf6'
    },
    {
        icon: <CreditCard />,
        title: 'Ипотека',
        description: 'Все банки',
        color: '#06b6d4'
    }
]

export default function ServicesGrid() {
    return (
        <Grid container spacing={3}>
            {services.map((service, index) => (
                <Grid item xs={6} md={4} key={index}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Paper
                            sx={{
                                p: 3,
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                '&:hover': {
                                    boxShadow: 6,
                                    transform: 'translateY(-4px)'
                                }
                            }}
                        >
                            <Box
                                sx={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 2,
                                    bgcolor: `${service.color}20`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto',
                                    mb: 2,
                                    color: service.color
                                }}
                            >
                                {service.icon}
                            </Box>
                            <Typography variant="h6" fontWeight="600" gutterBottom>
                                {service.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {service.description}
                            </Typography>
                        </Paper>
                    </motion.div>
                </Grid>
            ))}
        </Grid>
    )
}