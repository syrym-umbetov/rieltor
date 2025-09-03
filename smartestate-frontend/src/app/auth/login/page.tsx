'use client'

import { useState } from 'react'
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Link,
    Divider,
    Alert,
    InputAdornment,
    IconButton
} from '@mui/material'
import {
    Visibility,
    VisibilityOff,
    Google,
    Facebook
} from '@mui/icons-material'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import NextLink from 'next/link'

export default function LoginPage() {
    const { login } = useAuth()
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            await login(formData.email, formData.password)
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Ошибка входа')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Paper sx={{ p: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Вход в SmartEstate
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Введите ваши данные для входа
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        fullWidth
                        label="Пароль"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        sx={{ mb: 3 }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Link component={NextLink} href="/auth/forgot-password" variant="body2">
                            Забыли пароль?
                        </Link>
                    </Box>

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{ mb: 2 }}
                    >
                        {loading ? 'Вход...' : 'Войти'}
                    </Button>

                    <Divider sx={{ my: 3 }}>ИЛИ</Divider>

                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Google />}
                        sx={{ mb: 2 }}
                    >
                        Войти через Google
                    </Button>

                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Facebook />}
                        sx={{ mb: 3 }}
                    >
                        Войти через Facebook
                    </Button>

                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2">
                            Нет аккаунта?{' '}
                            <Link component={NextLink} href="/auth/register" fontWeight="600">
                                Зарегистрироваться
                            </Link>
                        </Typography>
                    </Box>
                </form>
            </Paper>
        </Container>
    )
}