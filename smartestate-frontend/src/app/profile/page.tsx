// app/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
    Container,
    Paper,
    Box,
    Typography,
    Avatar,
    Button,
    TextField,
    Alert,
    CircularProgress,
    Grid,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText
} from '@mui/material'
import {
    Edit,
    Save,
    Cancel,
    Email,
    Phone,
    Person,
    CalendarToday,
    Logout
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

export default function ProfilePage() {
    const router = useRouter()
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [editMode, setEditMode] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [editData, setEditData] = useState({
        full_name: '',
        phone: ''
    })

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            const token = localStorage.getItem('access_token')

            if (!token) {
                router.push('/auth/login')
                return
            }

            // Пробуем загрузить из localStorage сначала для быстрого отображения
            const savedUser = localStorage.getItem('user')
            if (savedUser) {
                try {
                    const userData = JSON.parse(savedUser)
                    setProfile(userData)
                    setEditData({
                        full_name: userData.full_name,
                        phone: userData.phone
                    })
                } catch (e) {
                    console.error('Error parsing saved user:', e)
                }
            }

            // Затем загружаем актуальные данные с сервера
            const response = await fetch(`${API_URL}/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            })

            if (response.status === 401) {
                // Токен истек
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                localStorage.removeItem('user')
                router.push('/auth/login')
                return
            }

            if (!response.ok) {
                throw new Error('Ошибка загрузки профиля')
            }

            const data = await response.json()
            setProfile(data)
            setEditData({
                full_name: data.full_name,
                phone: data.phone
            })
        } catch (err: any) {
            console.error('Profile load error:', err)
            setError(err.message || 'Ошибка загрузки профиля')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setError('')
        setSuccess('')

        try {
            const token = localStorage.getItem('access_token')

            if (!token) {
                router.push('/auth/login')
                return
            }

            const response = await fetch(`${API_URL}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    full_name: editData.full_name,
                    phone: editData.phone
                })
            })

            if (response.status === 401) {
                router.push('/auth/login')
                return
            }

            if (!response.ok) {
                throw new Error('Ошибка обновления профиля')
            }

            const updatedProfile = await response.json()
            setProfile(updatedProfile)
            localStorage.setItem('user', JSON.stringify(updatedProfile))
            setEditMode(false)
            setSuccess('Профиль успешно обновлен')
        } catch (err: any) {
            setError(err.message || 'Ошибка обновления профиля')
        } finally {
            setSaving(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        router.push('/')
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    if (loading) {
        return (
            <ProtectedRoute>
                <Container maxWidth="md" sx={{ py: 4 }}>
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                        <CircularProgress />
                    </Box>
                </Container>
            </ProtectedRoute>
        )
    }

    if (!profile) {
        return (
            <ProtectedRoute>
                <Container maxWidth="md" sx={{ py: 4 }}>
                    <Alert severity="error">
                        Не удалось загрузить профиль.
                        <Button size="small" onClick={loadProfile}>Попробовать снова</Button>
                    </Alert>
                </Container>
            </ProtectedRoute>
        )
    }

    return (
        <ProtectedRoute>
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Профиль
                </Typography>

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                        {success}
                    </Alert>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={3}>
                    {/* Левая колонка - Аватар и основная информация */}
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <Avatar
                                src={profile.avatar_url}
                                sx={{ width: 100, height: 100, mx: 'auto', mb: 2 }}
                            >
                                {profile.full_name?.[0]?.toUpperCase()}
                            </Avatar>

                            <Typography variant="h6" gutterBottom>
                                {profile.full_name}
                            </Typography>

                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {profile.email}
                            </Typography>

                            <Divider sx={{ my: 2 }} />

                            <List dense>
                                <ListItem>
                                    <ListItemIcon>
                                        <CalendarToday fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Дата регистрации"
                                        secondary={formatDate(profile.created_at)}
                                    />
                                </ListItem>
                            </List>

                            <Button
                                variant="outlined"
                                color="error"
                                fullWidth
                                startIcon={<Logout />}
                                onClick={handleLogout}
                                sx={{ mt: 2 }}
                            >
                                Выйти
                            </Button>
                        </Paper>
                    </Grid>

                    {/* Правая колонка - Редактируемая информация */}
                    <Grid item xs={12} md={8}>
                        <Paper sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                <Typography variant="h6">Личная информация</Typography>
                                {!editMode ? (
                                    <Button
                                        startIcon={<Edit />}
                                        onClick={() => setEditMode(true)}
                                        variant="outlined"
                                        size="small"
                                    >
                                        Редактировать
                                    </Button>
                                ) : (
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                            startIcon={<Cancel />}
                                            onClick={() => {
                                                setEditMode(false)
                                                setEditData({
                                                    full_name: profile.full_name,
                                                    phone: profile.phone
                                                })
                                            }}
                                            size="small"
                                        >
                                            Отмена
                                        </Button>
                                        <Button
                                            startIcon={<Save />}
                                            onClick={handleSave}
                                            variant="contained"
                                            size="small"
                                            disabled={saving}
                                        >
                                            {saving ? 'Сохранение...' : 'Сохранить'}
                                        </Button>
                                    </Box>
                                )}
                            </Box>

                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Полное имя"
                                        value={editMode ? editData.full_name : profile.full_name}
                                        onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                                        disabled={!editMode}
                                        InputProps={{
                                            startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                                        }}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        value={profile.email}
                                        disabled
                                        helperText="Email нельзя изменить"
                                        InputProps={{
                                            startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />
                                        }}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Телефон"
                                        value={editMode ? editData.phone : profile.phone}
                                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                        disabled={!editMode}
                                        placeholder="+7 (xxx) xxx-xx-xx"
                                        InputProps={{
                                            startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />
                                        }}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Роль"
                                        value={profile.role === 'admin' ? 'Администратор' : 'Пользователь'}
                                        disabled
                                        helperText="Роль назначается администратором"
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Подписка"
                                        value={profile.subscription_tier === 'free' ? 'Бесплатная' : profile.subscription_tier}
                                        disabled
                                        helperText="Для изменения подписки обратитесь к администратору"
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </ProtectedRoute>
    )
}