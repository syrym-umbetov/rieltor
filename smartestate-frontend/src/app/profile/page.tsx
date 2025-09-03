'use client'

import { useState } from 'react'
import {
    Container,
    Grid,
    Paper,
    Typography,
    Box,
    Avatar,
    Button,
    TextField,
    Tab,
    Tabs,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Card,
    CardContent,
    Chip,
    Switch,
    Divider
} from '@mui/material'
import {
    Edit,
    Save,
    Cancel,
    Home,
    Favorite,
    History,
    Settings,
    Payment,
    Notifications,
    Security,
    Delete,
    ChevronRight
} from '@mui/icons-material'
import { useAuth } from '@/hooks/useAuth'

export default function ProfilePage() {
    const { user, updateProfile } = useAuth()
    const [activeTab, setActiveTab] = useState(0)
    const [isEditing, setIsEditing] = useState(false)
    const [profileData, setProfileData] = useState({
        full_name: user?.full_name || '',
        email: user?.email || '',
        phone: user?.phone || ''
    })

    const handleSave = async () => {
        await updateProfile(profileData)
        setIsEditing(false)
    }

    const stats = [
        { label: 'Просмотров', value: 156 },
        { label: 'Избранное', value: 23 },
        { label: 'Объявлений', value: 5 },
        { label: 'Заявок', value: 12 }
    ]

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Profile Header */}
            <Paper sx={{ p: 4, mb: 3 }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item>
                        <Avatar
                            src={user?.avatar_url}
                            sx={{ width: 100, height: 100, fontSize: '2rem' }}
                        >
                            {user?.full_name?.[0]}
                        </Avatar>
                    </Grid>

                    <Grid item xs>
                        {isEditing ? (
                            <Box>
                                <TextField
                                    fullWidth
                                    label="Полное имя"
                                    value={profileData.full_name}
                                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    fullWidth
                                    label="Email"
                                    value={profileData.email}
                                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    fullWidth
                                    label="Телефон"
                                    value={profileData.phone}
                                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                />
                            </Box>
                        ) : (
                            <Box>
                                <Typography variant="h4" fontWeight="bold">
                                    {user?.full_name || 'Пользователь'}
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    {user?.email}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {user?.phone}
                                </Typography>
                                <Chip
                                    label={user?.subscription_tier === 'premium' ? 'Premium' : 'Бесплатный'}
                                    color={user?.subscription_tier === 'premium' ? 'primary' : 'default'}
                                    size="small"
                                    sx={{ mt: 1 }}
                                />
                            </Box>
                        )}
                    </Grid>

                    <Grid item>
                        {isEditing ? (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<Save />}
                                    onClick={handleSave}
                                >
                                    Сохранить
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<Cancel />}
                                    onClick={() => setIsEditing(false)}
                                >
                                    Отмена
                                </Button>
                            </Box>
                        ) : (
                            <Button
                                variant="outlined"
                                startIcon={<Edit />}
                                onClick={() => setIsEditing(true)}
                            >
                                Редактировать
                            </Button>
                        )}
                    </Grid>
                </Grid>
            </Paper>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {stats.map((stat) => (
                    <Grid item xs={6} md={3} key={stat.label}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" color="primary" fontWeight="bold">
                                    {stat.value}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {stat.label}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Tabs */}
            <Paper>
                <Tabs
                    value={activeTab}
                    onChange={(_, value) => setActiveTab(value)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Мои объявления" />
                    <Tab label="Избранное" />
                    <Tab label="История" />
                    <Tab label="Настройки" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {activeTab === 0 && (
                        <List>
                            <ListItem>
                                <ListItemIcon>
                                    <Home />
                                </ListItemIcon>
                                <ListItemText
                                    primary="3-комнатная квартира"
                                    secondary="Алматы, Медеу • 45 000 000 ₸"
                                />
                                <ListItemSecondaryAction>
                                    <IconButton>
                                        <ChevronRight />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        </List>
                    )}

                    {activeTab === 1 && (
                        <List>
                            <ListItem>
                                <ListItemIcon>
                                    <Favorite color="error" />
                                </ListItemIcon>
                                <ListItemText
                                    primary="2-комнатная квартира"
                                    secondary="Астана, Есиль • 32 000 000 ₸"
                                />
                                <ListItemSecondaryAction>
                                    <IconButton>
                                        <Delete />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        </List>
                    )}

                    {activeTab === 2 && (
                        <List>
                            <ListItem>
                                <ListItemIcon>
                                    <History />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Просмотр квартиры"
                                    secondary="15.01.2024 • ул. Абая, 150"
                                />
                            </ListItem>
                        </List>
                    )}

                    {activeTab === 3 && (
                        <List>
                            <ListItem>
                                <ListItemIcon>
                                    <Notifications />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Уведомления"
                                    secondary="Получать новости и предложения"
                                />
                                <ListItemSecondaryAction>
                                    <Switch defaultChecked />
                                </ListItemSecondaryAction>
                            </ListItem>
                            <Divider />
                            <ListItem>
                                <ListItemIcon>
                                    <Security />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Безопасность"
                                    secondary="Изменить пароль"
                                />
                                <ListItemSecondaryAction>
                                    <IconButton>
                                        <ChevronRight />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                            <Divider />
                            <ListItem>
                                <ListItemIcon>
                                    <Payment />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Подписка"
                                    secondary="Управление тарифным планом"
                                />
                                <ListItemSecondaryAction>
                                    <IconButton>
                                        <ChevronRight />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        </List>
                    )}
                </Box>
            </Paper>
        </Container>
    )
}