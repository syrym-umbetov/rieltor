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
    Alert,
    InputAdornment,
    IconButton,
    Checkbox,
    FormControlLabel,
    Stepper,
    Step,
    StepLabel
} from '@mui/material'
import {
    Visibility,
    VisibilityOff,
    Person,
    Email,
    Phone,
    Lock
} from '@mui/icons-material'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import NextLink from 'next/link'

export default function RegisterPage() {
    const { register } = useAuth()
    const router = useRouter()
    const [activeStep, setActiveStep] = useState(0)
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        agreeToTerms: false
    })

    const steps = ['Личные данные', 'Контакты', 'Пароль']

    const handleNext = () => {
        setActiveStep((prev) => prev + 1)
    }

    const handleBack = () => {
        setActiveStep((prev) => prev - 1)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.password !== formData.confirmPassword) {
            setError('Пароли не совпадают')
            return
        }

        if (!formData.agreeToTerms) {
            setError('Необходимо принять условия использования')
            return
        }

        setLoading(true)
        setError('')

        try {
            await register({
                email: formData.email,
                password: formData.password,
                full_name: formData.full_name,
                phone: formData.phone
            })
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Ошибка регистрации')
        } finally {
            setLoading(false)
        }
    }

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <TextField
                        fullWidth
                        label="Полное имя"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Person />
                                </InputAdornment>
                            )
                        }}
                    />
                )
            case 1:
                return (
                    <>
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            sx={{ mb: 2 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Email />
                                    </InputAdornment>
                                )
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Телефон"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Phone />
                                    </InputAdornment>
                                )
                            }}
                        />
                    </>
                )
            case 2:
                return (
                    <>
                        <TextField
                            fullWidth
                            label="Пароль"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            sx={{ mb: 2 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Lock />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Подтвердите пароль"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                            sx={{ mb: 2 }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={formData.agreeToTerms}
                                    onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                                />
                            }
                            label={
                                <Typography variant="body2">
                                    Я согласен с{' '}
                                    <Link href="/terms">условиями использования</Link>
                                </Typography>
                            }
                        />
                    </>
                )
            default:
                return null
        }
    }

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Paper sx={{ p: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Регистрация
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Создайте аккаунт в SmartEstate
                    </Typography>
                </Box>

                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Box sx={{ mb: 3 }}>
                        {renderStepContent()}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Button
                            disabled={activeStep === 0}
                            onClick={handleBack}
                        >
                            Назад
                        </Button>

                        {activeStep === steps.length - 1 ? (
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={loading}
                            >
                                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={handleNext}
                            >
                                Далее
                            </Button>
                        )}
                    </Box>
                </form>

                <Box sx={{ textAlign: 'center', mt: 3 }}>
                    <Typography variant="body2">
                        Уже есть аккаунт?{' '}
                        <Link component={NextLink} href="/auth/login" fontWeight="600">
                            Войти
                        </Link>
                    </Typography>
                </Box>
            </Paper>
        </Container>
    )
}