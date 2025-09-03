'use client'

import {
    Container,
    Grid,
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    CardActions,
    Button,
    Chip,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Tab,
    Tabs
} from '@mui/material'
import { useState } from 'react'
import {
    Check,
    Star,
    TrendingUp,
    Camera,
    Palette,
    Assessment,
    Gavel,
    School,
    Support
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'

const plans = [
    {
        name: 'Бесплатный',
        price: 0,
        features: [
            '3 объявления в месяц',
            'Базовый AI-поиск',
            'Просмотр контактов',
            'Email поддержка'
        ],
        color: 'grey'
    },
    {
        name: 'Premium',
        price: 2990,
        popular: true,
        features: [
            'Неограниченные объявления',
            'AI-риелтор 24/7',
            'AI-таргетолог (10 кампаний)',
            'VR туры и 3D просмотры',
            'Приоритетная поддержка',
            'Аналитика и отчеты'
        ],
        color: 'primary'
    },
    {
        name: 'Business',
        price: 19990,
        features: [
            'Все возможности Premium',
            'Неограниченный AI-таргетинг',
            'API интеграция',
            'White Label решение',
            'Персональный менеджер',
            'Обучение команды',
            'Приоритет в поиске'
        ],
        color: 'secondary'
    }
]

const additionalServices = [
    {
        icon: <Camera />,
        title: 'Профессиональная съемка',
        description: 'HDR фото + 3D тур',
        price: 25000
    },
    {
        icon: <Palette />,
        title: 'Виртуальный стейджинг',
        description: 'AI мебелировка',
        price: 5000
    },
    {
        icon: <Assessment />,
        title: 'Профессиональная оценка',
        description: 'Официальный отчет',
        price: 15000
    },
    {
        icon: <Gavel />,
        title: 'Юридическое сопровождение',
        description: 'Полная проверка документов',
        price: 50000
    },
    {
        icon: <School />,
        title: 'Обучение риелторов',
        description: 'Курс по работе с AI',
        price: 35000
    },
    {
        icon: <Support />,
        title: 'Персональный менеджер',
        description: 'Dedicated support',
        price: 10000
    }
]

export default function ServicesPage() {
    const [selectedTab, setSelectedTab] = useState(0)
    const router = useRouter()

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom align="center">
                Тарифы и услуги
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
                Выберите подходящий план для вашего бизнеса
            </Typography>

            <Tabs
                value={selectedTab}
                onChange={(_, value) => setSelectedTab(value)}
                centered
                sx={{ mb: 4 }}
            >
                <Tab label="Тарифные планы" />
                <Tab label="Дополнительные услуги" />
                <Tab label="AI Таргетинг" />
            </Tabs>

            {selectedTab === 0 && (
                <Grid container spacing={3}>
                    {plans.map((plan) => (
                        <Grid item xs={12} md={4} key={plan.name}>
                            <Card
                                sx={{
                                    height: '100%',
                                    position: 'relative',
                                    border: plan.popular ? 2 : 1,
                                    borderColor: plan.popular ? 'primary.main' : 'divider'
                                }}
                            >
                                {plan.popular && (
                                    <Chip
                                        label="Популярный"
                                        color="primary"
                                        sx={{
                                            position: 'absolute',
                                            top: -12,
                                            right: 20
                                        }}
                                    />
                                )}

                                <CardContent sx={{ textAlign: 'center', pt: 4 }}>
                                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                                        {plan.name}
                                    </Typography>
                                    <Typography variant="h3" color={`${plan.color}.main`} fontWeight="bold">
                                        {plan.price.toLocaleString()} ₸
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        в месяц
                                    </Typography>

                                    <List sx={{ mt: 3 }}>
                                        {plan.features.map((feature, index) => (
                                            <ListItem key={index} sx={{ py: 0.5 }}>
                                                <ListItemIcon sx={{ minWidth: 30 }}>
                                                    <Check color="success" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={feature}
                                                    primaryTypographyProps={{ variant: 'body2' }}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </CardContent>

                                <CardActions sx={{ p: 2 }}>
                                    <Button
                                        variant={plan.popular ? 'contained' : 'outlined'}
                                        fullWidth
                                        size="large"
                                        color={plan.color as any}
                                    >
                                        {plan.price === 0 ? 'Текущий план' : 'Выбрать план'}
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {selectedTab === 1 && (
                <Grid container spacing={3}>
                    {additionalServices.map((service) => (
                        <Grid item xs={12} sm={6} md={4} key={service.title}>
                            <Paper sx={{ p: 3, height: '100%' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Box
                                        sx={{
                                            width: 50,
                                            height: 50,
                                            borderRadius: 2,
                                            bgcolor: 'primary.light',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mr: 2
                                        }}
                                    >
                                        {service.icon}
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight="600">
                                            {service.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {service.description}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="h6" color="primary">
                                        {service.price.toLocaleString()} ₸
                                    </Typography>
                                    <Button variant="outlined" size="small">
                                        Заказать
                                    </Button>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}

            {selectedTab === 2 && (
                <Paper sx={{ p: 4 }}>
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h5" fontWeight="bold" gutterBottom>
                                🎯 AI Таргетолог
                            </Typography>
                            <Typography variant="body1" paragraph>
                                Автоматическое продвижение вашей недвижимости в социальных сетях
                            </Typography>

                            <List>
                                <ListItem>
                                    <ListItemIcon>
                                        <Star color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Автоматическое создание креативов"
                                        secondary="AI генерирует тексты и изображения"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>
                                        <TrendingUp color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Оптимизация в реальном времени"
                                        secondary="24/7 мониторинг и корректировка ставок"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>
                                        <Assessment color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Детальная аналитика"
                                        secondary="ROI, конверсии, воронка продаж"
                                    />
                                </ListItem>
                            </List>

                            <Button
                                variant="contained"
                                size="large"
                                sx={{ mt: 3 }}
                                onClick={() => router.push('/targeting')}
                            >
                                Запустить кампанию
                            </Button>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Box
                                sx={{
                                    bgcolor: 'grey.100',
                                    borderRadius: 2,
                                    p: 3,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}
                            >
                                <Typography variant="h1">🚀</Typography>
                                <Typography variant="h6" align="center" sx={{ mt: 2 }}>
                                    Увеличьте продажи на 300%
                                </Typography>
                                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                                    Средний результат наших клиентов за 3 месяца
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            )}
        </Container>
    )
}