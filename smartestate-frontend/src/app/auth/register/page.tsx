'use client'

import { useState } from 'react'
import GuestRoute from '@/components/auth/GuestRoute'
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
    Checkbox,
    FormControlLabel,
    Divider,
    CircularProgress
} from '@mui/material'
import {
    Visibility,
    VisibilityOff,
    Person,
    Email,
    Phone,
    Lock
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import NextLink from 'next/link'

export default function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [agreeToTerms, setAgreeToTerms] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')

        if (!agreeToTerms) {
            setError('Необходимо принять условия использования')
            return
        }

        setLoading(true)

        // Получаем данные прямо из формы - это работает!
        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string
        const full_name = formData.get('full_name') as string
        const phone = formData.get('phone') as string

        // Проверка паролей
        if (password !== confirmPassword) {
            setError('Пароли не совпадают')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('Пароль должен быть не менее 6 символов')
            setLoading(false)
            return
        }

        try {
            // Регистрация
            const registerResponse = await fetch('http://localhost:8080/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    full_name,
                    phone: phone || ''
                })
            })

            if (!registerResponse.ok) {
                const errorText = await registerResponse.text()
                let errorMessage = 'Ошибка регистрации'
                try {
                    const errorData = JSON.parse(errorText)
                    errorMessage = errorData.detail || errorData.message || errorMessage
                } catch {
                    // Используем дефолтное сообщение
                }
                throw new Error(errorMessage)
            }

            // Автоматический вход после регистрации
            const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })

            if (!loginResponse.ok) {
                // Если логин не удался, перенаправляем на страницу входа
                router.push('/auth/login')
                return
            }

            const data = await loginResponse.json()

            // Сохраняем токены
            localStorage.setItem('access_token', data.access_token)
            localStorage.setItem('refresh_token', data.refresh_token)
            localStorage.setItem('user', JSON.stringify(data.user))

            // Редирект
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Ошибка регистрации')
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
                        Регистрация
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Создайте аккаунт в SmartEstate
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {/* Личные данные */}
                        <TextField
                            fullWidth
                            label="Полное имя"
                            name="full_name"
                            type="text"
                            required
                            autoFocus
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Person color="action" />
                                    </InputAdornment>
                                )
                            }}
                        />

                        {/* Контактные данные */}
                        <TextField
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
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
                            label="Телефон"
                            name="phone"
                            type="tel"
                            placeholder="+77001234567"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Phone color="action" />
                                    </InputAdornment>
                                )
                            }}
                        />

                        <Divider sx={{ my: 1 }} />

                        {/* Пароли */}
                        <TextField
                            fullWidth
                            label="Пароль"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            autoComplete="new-password"
                            helperText="Минимум 6 символов"
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

                        <TextField
                            fullWidth
                            label="Подтвердите пароль"
                            name="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            autoComplete="new-password"
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
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            onMouseDown={(e) => e.preventDefault()}
                                        >
                                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        {/* Условия использования */}
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={agreeToTerms}
                                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label={
                                <Typography variant="body2">
                                    Я согласен с{' '}
                                    <Link
                                        component={NextLink}
                                        href="/terms"
                                        sx={{ textDecoration: 'none' }}
                                    >
                                        условиями использования
                                    </Link>
                                </Typography>
                            }
                        />

                        {/* Кнопка отправки */}
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            fullWidth
                            disabled={loading || !agreeToTerms}
                            sx={{ mt: 2, py: 1.5 }}
                        >
                            {loading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                'Зарегистрироваться'
                            )}
                        </Button>
                    </Box>
                </form>

                <Box sx={{ textAlign: 'center', mt: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                        Уже есть аккаунт?{' '}
                        <Link
                            component={NextLink}
                            href="/auth/login"
                            fontWeight="600"
                            sx={{ textDecoration: 'none' }}
                        >
                            Войти
                        </Link>
                    </Typography>
                </Box>
            </Paper>
        </Container>
        </GuestRoute>
    )
}