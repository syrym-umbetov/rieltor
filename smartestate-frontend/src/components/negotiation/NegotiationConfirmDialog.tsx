'use client'

import React, { useState } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Card,
    CardContent,
    Chip,
    TextField,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Divider,
    Avatar,
    Stack
} from '@mui/material'
import {
    Phone,
    SmartToy,
    LocationOn,
    AttachMoney,
    PersonAdd,
    Close,
    CheckCircle
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'

interface SelectedProperty {
    id: string | number
    title: string
    price: string
    image?: string
    link?: string
    address?: string
}

interface NegotiationConfirmDialogProps {
    open: boolean
    onClose: () => void
    selectedProperties: SelectedProperty[]
    onStartNegotiation: (negotiationData: NegotiationData) => void
}

interface NegotiationData {
    properties: SelectedProperty[]
    clientInfo: {
        name: string
        phone: string
        budget: string
        preferences: string[]
    }
    negotiationGoals: {
        priceReduction: boolean
        viewing: boolean
        quickDecision: boolean
    }
}

export default function NegotiationConfirmDialog({
    open,
    onClose,
    selectedProperties,
    onStartNegotiation
}: NegotiationConfirmDialogProps) {
    const [step, setStep] = useState<'confirm' | 'details' | 'processing'>('confirm')
    const [clientName, setClientName] = useState('')
    const [clientPhone, setClientPhone] = useState('')
    const [budget, setBudget] = useState('')
    const [preferences, setPreferences] = useState<string[]>(['priceReduction', 'viewing'])
    const [negotiationGoals, setNegotiationGoals] = useState({
        priceReduction: true,
        viewing: true,
        quickDecision: false
    })

    const handlePreferenceChange = (pref: string) => {
        setPreferences(prev =>
            prev.includes(pref)
                ? prev.filter(p => p !== pref)
                : [...prev, pref]
        )
    }

    const handleStartNegotiation = () => {
        setStep('processing')

        const negotiationData: NegotiationData = {
            properties: selectedProperties,
            clientInfo: {
                name: clientName,
                phone: clientPhone,
                budget,
                preferences
            },
            negotiationGoals
        }

        setTimeout(() => {
            onStartNegotiation(negotiationData)
            onClose()
        }, 2000)
    }

    const renderConfirmStep = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            <DialogContent>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Avatar sx={{
                        bgcolor: 'primary.main',
                        width: 64,
                        height: 64,
                        mx: 'auto',
                        mb: 2
                    }}>
                        <SmartToy sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Typography variant="h5" fontWeight="600" gutterBottom>
                        🤝 Договориться с продавцами?
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                        Я свяжусь с продавцами выбранных объектов и проведу переговоры от вашего имени
                    </Typography>
                </Box>

                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Выбранные объекты ({selectedProperties.length}):
                </Typography>

                <Stack spacing={2} sx={{ mb: 3, maxHeight: 300, overflow: 'auto' }}>
                    {selectedProperties.map((property, index) => (
                        <Card key={property.id} variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle1" fontWeight="500" sx={{ mb: 0.5 }}>
                                            {index + 1}. {property.title}
                                        </Typography>
                                        {property.address && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                                <LocationOn sx={{ fontSize: 14, color: 'text.secondary', mr: 0.5 }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    {property.address}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                    <Chip
                                        label={property.price}
                                        color="primary"
                                        size="small"
                                        sx={{ fontWeight: 600 }}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>

                <Box sx={{
                    bgcolor: 'primary.light',
                    borderRadius: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'primary.main'
                }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                        🤖 Что я сделаю:
                    </Typography>
                    <Box component="ul" sx={{
                        m: 0,
                        pl: 2,
                        '& li': {
                            fontSize: '0.875rem',
                            mb: 0.5,
                            color: 'primary.contrastText'
                        }
                    }}>
                        <li>• Позвоню продавцам каждого объекта</li>
                        <li>• Узнаю актуальность и возможность торга</li>
                        <li>• Договорюсь о просмотре в удобное время</li>
                        <li>• Получу дополнительную информацию</li>
                        <li>• Предоставлю подробный отчет</li>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                >
                    Отменить
                </Button>
                <Button
                    onClick={() => setStep('details')}
                    variant="contained"
                    sx={{
                        borderRadius: 2,
                        px: 4
                    }}
                >
                    Да, договориться!
                </Button>
            </DialogActions>
        </motion.div>
    )

    const renderDetailsStep = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
        >
            <DialogContent>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                    📝 Информация для переговоров
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Эта информация поможет мне лучше представлять ваши интересы
                </Typography>

                <Stack spacing={3}>
                    <TextField
                        label="Ваше имя"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        fullWidth
                        required
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    <TextField
                        label="Телефон для связи"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        fullWidth
                        required
                        placeholder="+7 (777) 123-45-67"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    <TextField
                        label="Ваш бюджет"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        fullWidth
                        placeholder="до 35 млн ₸"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    <Divider />

                    <Typography variant="subtitle1" fontWeight="600">
                        🎯 Цели переговоров:
                    </Typography>

                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={negotiationGoals.priceReduction}
                                    onChange={(e) => setNegotiationGoals(prev =>
                                        ({ ...prev, priceReduction: e.target.checked })
                                    )}
                                />
                            }
                            label="💰 Торговаться по цене"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={negotiationGoals.viewing}
                                    onChange={(e) => setNegotiationGoals(prev =>
                                        ({ ...prev, viewing: e.target.checked })
                                    )}
                                />
                            }
                            label="👁️ Договориться о просмотре"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={negotiationGoals.quickDecision}
                                    onChange={(e) => setNegotiationGoals(prev =>
                                        ({ ...prev, quickDecision: e.target.checked })
                                    )}
                                />
                            }
                            label="⚡ Готов к быстрому решению (скидка за скорость)"
                        />
                    </FormGroup>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0 }}>
                <Button
                    onClick={() => setStep('confirm')}
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                >
                    Назад
                </Button>
                <Button
                    onClick={handleStartNegotiation}
                    disabled={!clientName || !clientPhone}
                    variant="contained"
                    startIcon={<Phone />}
                    sx={{
                        borderRadius: 2,
                        px: 4
                    }}
                >
                    Начать звонки
                </Button>
            </DialogActions>
        </motion.div>
    )

    const renderProcessingStep = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
        >
            <DialogContent sx={{ textAlign: 'center', py: 4 }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                    <SmartToy sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                </motion.div>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                    🤖 Запускаю ИИ-переговорщика...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Готовлю информацию для звонков и начинаю переговоры
                </Typography>
            </DialogContent>
        </motion.div>
    )

    return (
        <Dialog
            open={open}
            onClose={step === 'processing' ? undefined : onClose}
            maxWidth="md"
            fullWidth
            sx={{
                '& .MuiDialog-paper': {
                    borderRadius: 3,
                    overflow: 'hidden'
                }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: step === 'processing' ? 'primary.main' : 'inherit',
                color: step === 'processing' ? 'white' : 'inherit'
            }}>
                <Box>
                    {step === 'confirm' && 'Подтверждение переговоров'}
                    {step === 'details' && 'Детали для переговоров'}
                    {step === 'processing' && 'Запуск ИИ-переговорщика'}
                </Box>
                {step !== 'processing' && (
                    <Button onClick={onClose} sx={{ minWidth: 'auto', p: 1 }}>
                        <Close />
                    </Button>
                )}
            </DialogTitle>

            <AnimatePresence mode="wait">
                {step === 'confirm' && renderConfirmStep()}
                {step === 'details' && renderDetailsStep()}
                {step === 'processing' && renderProcessingStep()}
            </AnimatePresence>
        </Dialog>
    )
}