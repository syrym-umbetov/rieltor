'use client'

import { useState } from 'react'
import GuestRoute from '@/components/auth/GuestRoute'
import { useAuth } from '@/hooks/useAuth'
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Link,
    Alert,
    InputAdornment,
    IconButton,
    CircularProgress
} from '@mui/material'
import {
    Visibility,
    VisibilityOff,
    Email,
    Lock
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import NextLink from 'next/link'

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const { login } = useAuth()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        // Получаем данные прямо из формы
        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        try {
            // Используем функцию login из AuthProvider
            await login(email, password)
            // После успешной авторизации GuestRoute автоматически перенаправит на главную
        } catch (err: any) {
            setError(err.message || 'Ошибка входа')
        } finally {
            setLoading(false)
        }
    }

    return (
        <GuestRoute>
            <Container maxWidth="sm" sx={{ py: 8 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Вход
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Войдите в свой аккаунт SmartEstate
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <TextField
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            autoFocus
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Email color="action" />
                                    </InputAdornment>
                                )
                            }}
                        />

                        <TextField
                            fullWidth
                            label="Пароль"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            autoComplete="current-password"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Lock color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            edge="end"
                                            onClick={() => setShowPassword(!showPassword)}
                                            onMouseDown={(e) => e.preventDefault()}
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Link
                                component={NextLink}
                                href="/auth/forgot-password"
                                variant="body2"
                                sx={{ textDecoration: 'none' }}
                            >
                                Забыли пароль?
                            </Link>
                        </Box>

                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            fullWidth
                            disabled={loading}
                            sx={{ mt: 2, py: 1.5 }}
                        >
                            {loading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                'Войти'
                            )}
                        </Button>
                    </Box>
                </form>

                <Box sx={{ textAlign: 'center', mt: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                        Нет аккаунта?{' '}
                        <Link
                            component={NextLink}
                            href="/auth/register"
                            fontWeight="600"
                            sx={{ textDecoration: 'none' }}
                        >
                            Зарегистрироваться
                        </Link>
                    </Typography>
                </Box>
            </Paper>
        </Container>
        </GuestRoute>
    )
}