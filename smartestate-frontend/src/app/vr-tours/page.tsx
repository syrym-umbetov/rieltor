'use client'

import { useState, useEffect } from 'react'
import {
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Button,
    Box,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Alert,
    Fab,
    Tooltip,
    Paper,
    Stack
} from '@mui/material'
import {
    Vrpano,
    Close,
    Fullscreen,
    ThreeDRotation,
    PlayArrow,
    Schedule,
    Home,
    LocationOn
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import VRPlayerUnified from '@/components/vr/VRPlayerUnified'

interface VRTour {
    id: string
    title: string
    description: string
    property_id: string
    property_title: string
    property_address: string
    property_type: string
    preview_image: string
    vr_scenes: VRScene[]
    duration: number
    views: number
    rating: number
    created_at: string
}

interface VRScene {
    id: string
    name: string
    image_360: string
    hotspots: VRHotspot[]
    audio_url?: string
    description?: string
}

interface VRHotspot {
    id: string
    type: 'navigation' | 'info' | 'media'
    position: { x: number; y: number; z: number }
    title: string
    description?: string
    target_scene_id?: string
    media_url?: string
}

export default function VRToursPage() {
    const [tours, setTours] = useState<VRTour[]>([])
    const [selectedTour, setSelectedTour] = useState<VRTour | null>(null)
    const [vrDialogOpen, setVrDialogOpen] = useState(false)
    const [webXRSupported, setWebXRSupported] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkWebXRSupport()
        loadVRTours()
    }, [])

    const checkWebXRSupport = async () => {
        if (typeof window !== 'undefined' && 'navigator' in window) {
            try {
                const supported = await navigator.xr?.isSessionSupported('immersive-vr')
                setWebXRSupported(!!supported)
            } catch {
                setWebXRSupported(false)
            }
        }
    }

    const loadVRTours = async () => {
        setLoading(true)
        try {
            // Имитация загрузки VR туров (замените на реальный API)
            setTimeout(() => {
                setTours(getMockVRTours())
                setLoading(false)
            }, 1000)
        } catch (error) {
            console.error('Error loading VR tours:', error)
            setTours(getMockVRTours())
            setLoading(false)
        }
    }

    const startVRTour = (tour: VRTour) => {
        setSelectedTour(tour)
        setVrDialogOpen(true)
    }

    const closeVRTour = () => {
        setVrDialogOpen(false)
        setSelectedTour(null)
    }

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                    <Typography variant="h5" color="text.secondary">
                        Загрузка VR туров...
                    </Typography>
                </Box>
            </Container>
        )
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 6 }}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                        <Vrpano sx={{ fontSize: 48, mr: 2, color: 'primary.main' }} />
                        <Typography
                            variant="h2"
                            component="h1"
                            sx={{
                                fontWeight: 800,
                                background: 'linear-gradient(45deg, #6366f1 30%, #8b5cf6 90%)',
                                backgroundClip: 'text',
                                textFillColor: 'transparent',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}
                        >
                            VR Туры
                        </Typography>
                    </Box>
                    
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 3, maxWidth: 800, mx: 'auto' }}>
                        Окунитесь в виртуальную реальность и осмотрите недвижимость как будто вы там. 
                        Современные VR-туры с поддержкой WebXR API.
                    </Typography>

                    {/* VR Support Status */}
                    <Paper 
                        elevation={1} 
                        sx={{ 
                            p: 2, 
                            mb: 4, 
                            maxWidth: 600, 
                            mx: 'auto',
                            backgroundColor: webXRSupported ? 'success.light' : 'warning.light',
                            color: webXRSupported ? 'success.contrastText' : 'warning.contrastText'
                        }}
                    >
                        <Typography variant="body2">
                            {webXRSupported 
                                ? '✅ WebXR поддерживается! Вы можете использовать VR-гарнитуру для полного погружения.'
                                : '⚠️ WebXR не поддерживается в вашем браузере. Используйте мышь для управления обзором.'
                            }
                        </Typography>
                    </Paper>

                    {/* Statistics */}
                    <Stack direction="row" spacing={4} justifyContent="center" sx={{ mb: 4 }}>
                        <Box textAlign="center">
                            <Typography variant="h4" fontWeight="bold" color="primary.main">
                                {tours.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                VR Туров
                            </Typography>
                        </Box>
                        <Box textAlign="center">
                            <Typography variant="h4" fontWeight="bold" color="primary.main">
                                360°
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Панорамы
                            </Typography>
                        </Box>
                        <Box textAlign="center">
                            <Typography variant="h4" fontWeight="bold" color="primary.main">
                                HD
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Качество
                            </Typography>
                        </Box>
                    </Stack>
                </motion.div>
            </Box>

            {/* VR Tours Grid */}
            <Grid container spacing={4}>
                {tours.map((tour, index) => (
                    <Grid item xs={12} md={6} lg={4} key={tour.id}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                        >
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.3s ease-in-out',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.12)'
                                    }
                                }}
                                onClick={() => startVRTour(tour)}
                            >
                                <Box sx={{ position: 'relative' }}>
                                    <CardMedia
                                        component="img"
                                        height={220}
                                        image={tour.preview_image || '/images/vr-placeholder.jpg'}
                                        alt={tour.title}
                                        sx={{
                                            filter: 'brightness(0.9)',
                                            transition: 'filter 0.3s ease'
                                        }}
                                    />
                                    
                                    {/* Play Button Overlay */}
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            opacity: 0.9
                                        }}
                                    >
                                        <Fab
                                            color="primary"
                                            size="large"
                                            sx={{
                                                background: 'linear-gradient(45deg, #6366f1 30%, #8b5cf6 90%)',
                                                '&:hover': {
                                                    transform: 'scale(1.1)'
                                                }
                                            }}
                                        >
                                            <Vrpano sx={{ fontSize: 32 }} />
                                        </Fab>
                                    </Box>

                                    {/* Duration Chip */}
                                    <Chip
                                        icon={<Schedule />}
                                        label={`${tour.duration} мин`}
                                        size="small"
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            backgroundColor: 'rgba(0,0,0,0.7)',
                                            color: 'white'
                                        }}
                                    />

                                    {/* Property Type Chip */}
                                    <Chip
                                        icon={<Home />}
                                        label={getPropertyTypeLabel(tour.property_type)}
                                        size="small"
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            left: 8,
                                            backgroundColor: 'primary.main',
                                            color: 'white'
                                        }}
                                    />
                                </Box>

                                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                                    <Typography variant="h6" gutterBottom fontWeight="bold">
                                        {tour.title}
                                    </Typography>
                                    
                                    <Typography variant="subtitle2" color="primary.main" gutterBottom>
                                        {tour.property_title}
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <LocationOn sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {tour.property_address}
                                        </Typography>
                                    </Box>

                                    <Typography variant="body2" paragraph color="text.secondary">
                                        {tour.description}
                                    </Typography>
                                    
                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <ThreeDRotation color="primary" fontSize="small" />
                                            <Typography variant="body2" color="text.secondary">
                                                {tour.vr_scenes.length} сцен
                                            </Typography>
                                        </Box>
                                        
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                👁 {tour.views.toLocaleString()} просмотров
                                            </Typography>
                                        </Box>
                                    </Stack>

                                    <Button
                                        variant="contained"
                                        fullWidth
                                        startIcon={<PlayArrow />}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            startVRTour(tour)
                                        }}
                                        sx={{
                                            background: 'linear-gradient(45deg, #6366f1 30%, #8b5cf6 90%)',
                                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                                            '&:hover': {
                                                background: 'linear-gradient(45deg, #5855eb 30%, #7c3aed 90%)',
                                                boxShadow: '0 6px 20px rgba(99, 102, 241, 0.6)'
                                            }
                                        }}
                                    >
                                        Начать VR тур
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                ))}
            </Grid>

            {/* VR Player Dialog */}
            <Dialog
                open={vrDialogOpen}
                onClose={closeVRTour}
                maxWidth={false}
                fullWidth
                PaperProps={{
                    sx: {
                        width: '95vw',
                        height: '95vh',
                        maxWidth: 'none',
                        maxHeight: 'none',
                        m: 1,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }
                }}
            >
                <DialogTitle sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    pb: 1,
                    color: 'white'
                }}>
                    <Box>
                        <Typography variant="h6">
                            {selectedTour?.title}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                            {selectedTour?.property_title}
                        </Typography>
                    </Box>
                    <IconButton onClick={closeVRTour} size="small" sx={{ color: 'white' }}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                
                <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
                    {selectedTour && (
                        <VRPlayerUnified tour={selectedTour} webXRSupported={webXRSupported} />
                    )}
                </DialogContent>
            </Dialog>
        </Container>
    )
}

// Получение человекочитаемого названия типа недвижимости
function getPropertyTypeLabel(type: string): string {
    const types: Record<string, string> = {
        'apartment': 'Квартира',
        'house': 'Дом',
        'studio': 'Студия',
        'office': 'Офис',
        'commercial': 'Коммерческая'
    }
    return types[type] || 'Недвижимость'
}

// Mock данные для VR туров
function getMockVRTours(): VRTour[] {
    return [
        {
            id: '1',
            title: '3-Bedroom VR Experience',
            description: 'Объединенное VR пространство трех спален! Треугольное расположение комнат с плавными переходами и интерактивной навигацией между спальнями.',
            property_id: '1',
            property_title: '3-комнатная квартира в центре Алматы',
            property_address: 'пр. Абая, 150, Алматы',
            property_type: 'apartment',
            preview_image: '/images/vr-tour1.jpg',
            duration: 8,
            views: 2847,
            rating: 4.8,
            vr_scenes: [
                {
                    id: 'bedroom1',
                    name: 'Главная спальня',
                    image_360: '/images/360/bedroom.png',
                    description: 'Просторная главная спальня с большой кроватью'
                },
                {
                    id: 'bedroom2',
                    name: 'Вторая спальня',
                    image_360: '/images/360/bedroom2.png',
                    description: 'Уютная спальня с современным дизайном'
                },
                {
                    id: 'bedroom3',
                    name: 'Третья спальня',
                    image_360: '/images/360/bedroom3.png',
                    description: 'Дополнительная спальня с оригинальным интерьером'
                }
            ],
            created_at: '2024-01-15T10:00:00Z'
        },
        {
            id: '2',
            title: 'Family House 360° Experience',
            description: 'Уютный семейный дом с садом. Интерактивный VR-тур с возможностью изучить каждую деталь интерьера.',
            property_id: '2',
            property_title: 'Коттедж в Алматинской области',
            property_address: 'коттеджный поселок "Алатау"',
            property_type: 'house',
            preview_image: '/images/vr-tour2.jpg',
            duration: 12,
            views: 1923,
            rating: 4.6,
            vr_scenes: [
                {
                    id: 'entrance',
                    name: 'Прихожая',
                    image_360: '/images/360/entrance.jpg',
                    description: 'Просторная прихожая с гардеробной',
                    hotspots: []
                },
                {
                    id: 'garden',
                    name: 'Сад',
                    image_360: '/images/360/garden.jpg',
                    description: 'Ландшафтный сад с беседкой',
                    hotspots: []
                }
            ],
            created_at: '2024-01-10T14:30:00Z'
        },
        {
            id: '3',
            title: 'Modern Smart Studio',
            description: 'Современная студия с системой умного дома. VR-демонстрация всех технологических возможностей.',
            property_id: '3',
            property_title: 'Студия в новостройке',
            property_address: 'ЖК "Алтын Орда", корпус 3, Алматы',
            property_type: 'studio',
            preview_image: '/images/vr-tour3.jpg',
            duration: 5,
            views: 3156,
            rating: 4.9,
            vr_scenes: [
                {
                    id: 'studio',
                    name: 'Студия',
                    image_360: '/images/360/studio.jpg',
                    description: 'Компактная студия с трансформируемой мебелью',
                    hotspots: [
                        {
                            id: 'smart-panel',
                            type: 'info',
                            position: { x: 0.7, y: 0.1, z: 0.2 },
                            title: 'Панель умного дома',
                            description: 'Управление освещением, температурой и безопасностью'
                        }
                    ]
                }
            ],
            created_at: '2024-01-20T09:15:00Z'
        }
    ]
}