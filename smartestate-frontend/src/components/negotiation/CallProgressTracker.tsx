'use client'

import React, { useState, useEffect } from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    LinearProgress,
    Chip,
    Avatar,
    Stack,
    Button,
    Divider,
    IconButton,
    Collapse,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondary,
    Fade
} from '@mui/material'
import {
    Phone,
    PhoneCallback,
    CheckCircle,
    Error,
    Schedule,
    ExpandMore,
    ExpandLess,
    Visibility,
    AttachMoney,
    SmartToy,
    RecordVoiceOver
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'

export type CallStatus = 'pending' | 'calling' | 'completed' | 'failed' | 'no_answer'

export interface CallResult {
    property: {
        id: string | number
        title: string
        price: string
        address?: string
    }
    status: CallStatus
    startTime?: Date
    endTime?: Date
    duration?: number
    outcome?: {
        isAvailable: boolean
        canNegotiate: boolean
        proposedPrice?: string
        viewingTime?: string
        sellerResponse: string
        nextStep: string
    }
    transcript?: string[]
    audioUrl?: string
}

interface CallProgressTrackerProps {
    calls: CallResult[]
    onViewCall?: (call: CallResult) => void
    onScheduleViewing?: (call: CallResult) => void
}

export default function CallProgressTracker({
    calls,
    onViewCall,
    onScheduleViewing
}: CallProgressTrackerProps) {
    const [expandedCalls, setExpandedCalls] = useState<Set<string | number>>(new Set())

    const toggleExpanded = (id: string | number) => {
        setExpandedCalls(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    const getStatusColor = (status: CallStatus) => {
        switch (status) {
            case 'completed': return 'success'
            case 'calling': return 'primary'
            case 'failed': return 'error'
            case 'no_answer': return 'warning'
            default: return 'default'
        }
    }

    const getStatusIcon = (status: CallStatus) => {
        switch (status) {
            case 'completed': return <CheckCircle />
            case 'calling': return <RecordVoiceOver />
            case 'failed': return <Error />
            case 'no_answer': return <Schedule />
            default: return <Phone />
        }
    }

    const getStatusText = (status: CallStatus) => {
        switch (status) {
            case 'pending': return 'В очереди'
            case 'calling': return 'Звоню...'
            case 'completed': return 'Завершен'
            case 'failed': return 'Не удался'
            case 'no_answer': return 'Не отвечает'
        }
    }

    const completedCalls = calls.filter(c => c.status === 'completed')
    const successfulNegotiations = completedCalls.filter(c => c.outcome?.canNegotiate)
    const totalProgress = calls.length > 0 ? (completedCalls.length / calls.length) * 100 : 0

    return (
        <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
            {/* Заголовок с общей статистикой */}
            <Box sx={{
                bgcolor: 'primary.main',
                color: 'white',
                p: 3
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                        <SmartToy />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight="600">
                            🤖 ИИ-переговорщик работает
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Звоню продавцам и договариваюсь о лучших условиях
                        </Typography>
                    </Box>
                </Box>

                <LinearProgress
                    variant="determinate"
                    value={totalProgress}
                    sx={{
                        height: 8,
                        borderRadius: 4,
                        mb: 2,
                        bgcolor: 'rgba(255,255,255,0.2)',
                        '& .MuiLinearProgress-bar': {
                            bgcolor: 'white'
                        }
                    }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">
                        Прогресс: {completedCalls.length} из {calls.length} звонков
                    </Typography>
                    <Typography variant="body2">
                        ✅ Успешных переговоров: {successfulNegotiations.length}
                    </Typography>
                </Box>
            </Box>

            <CardContent sx={{ p: 0 }}>
                <List sx={{ p: 0 }}>
                    {calls.map((call, index) => (
                        <motion.div
                            key={call.property.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <ListItem
                                sx={{
                                    px: 3,
                                    py: 2,
                                    borderBottom: index < calls.length - 1 ? '1px solid' : 'none',
                                    borderColor: 'divider',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'grey.50' }
                                }}
                                onClick={() => toggleExpanded(call.property.id)}
                            >
                                <ListItemIcon>
                                    <Avatar
                                        sx={{
                                            bgcolor: `${getStatusColor(call.status)}.main`,
                                            width: 40,
                                            height: 40
                                        }}
                                    >
                                        {getStatusIcon(call.status)}
                                    </Avatar>
                                </ListItemIcon>

                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <Typography variant="subtitle1" fontWeight="500">
                                                {call.property.title}
                                            </Typography>
                                            <Chip
                                                label={getStatusText(call.status)}
                                                color={getStatusColor(call.status)}
                                                size="small"
                                                sx={{ fontWeight: 500 }}
                                            />
                                        </Box>
                                    }
                                    secondary={
                                        <Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                {call.property.price} • {call.property.address}
                                            </Typography>
                                            {call.status === 'calling' && (
                                                <motion.div
                                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                >
                                                    <Typography variant="caption" color="primary">
                                                        📞 Идет звонок...
                                                    </Typography>
                                                </motion.div>
                                            )}
                                            {call.outcome?.sellerResponse && (
                                                <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                                    "{call.outcome.sellerResponse}"
                                                </Typography>
                                            )}
                                        </Box>
                                    }
                                />

                                <IconButton>
                                    {expandedCalls.has(call.property.id) ? <ExpandLess /> : <ExpandMore />}
                                </IconButton>
                            </ListItem>

                            {/* Детали звонка */}
                            <Collapse in={expandedCalls.has(call.property.id)}>
                                <Box sx={{ bgcolor: 'grey.50', px: 3, py: 2 }}>
                                    {call.outcome && (
                                        <Stack spacing={2}>
                                            <Typography variant="subtitle2" fontWeight="600">
                                                📋 Результаты переговоров:
                                            </Typography>

                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                <Chip
                                                    icon={call.outcome.isAvailable ? <CheckCircle /> : <Error />}
                                                    label={call.outcome.isAvailable ? 'Доступна' : 'Недоступна'}
                                                    color={call.outcome.isAvailable ? 'success' : 'error'}
                                                    size="small"
                                                />
                                                {call.outcome.canNegotiate && (
                                                    <Chip
                                                        icon={<AttachMoney />}
                                                        label="Готов торговаться"
                                                        color="success"
                                                        size="small"
                                                    />
                                                )}
                                                {call.outcome.proposedPrice && (
                                                    <Chip
                                                        label={`Цена: ${call.outcome.proposedPrice}`}
                                                        color="primary"
                                                        size="small"
                                                    />
                                                )}
                                            </Box>

                                            {call.outcome.viewingTime && (
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        📅 Предложенное время просмотра:
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="500">
                                                        {call.outcome.viewingTime}
                                                    </Typography>
                                                </Box>
                                            )}

                                            <Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    🎯 Следующий шаг:
                                                </Typography>
                                                <Typography variant="body2" fontWeight="500">
                                                    {call.outcome.nextStep}
                                                </Typography>
                                            </Box>

                                            {call.duration && (
                                                <Typography variant="caption" color="text.secondary">
                                                    ⏱️ Длительность звонка: {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                                                </Typography>
                                            )}

                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button
                                                    size="small"
                                                    startIcon={<Visibility />}
                                                    onClick={() => onViewCall?.(call)}
                                                >
                                                    Подробнее
                                                </Button>
                                                {call.outcome.viewingTime && (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        startIcon={<Schedule />}
                                                        onClick={() => onScheduleViewing?.(call)}
                                                    >
                                                        Записаться на просмотр
                                                    </Button>
                                                )}
                                            </Box>
                                        </Stack>
                                    )}

                                    {call.status === 'failed' && (
                                        <Typography variant="body2" color="error.main">
                                            ❌ Не удалось связаться с продавцом. Попробуем позже.
                                        </Typography>
                                    )}

                                    {call.status === 'no_answer' && (
                                        <Typography variant="body2" color="warning.main">
                                            📵 Продавец не отвечает. Повторим попытку через час.
                                        </Typography>
                                    )}
                                </Box>
                            </Collapse>
                        </motion.div>
                    ))}
                </List>
            </CardContent>

            {/* Итоговая статистика */}
            {completedCalls.length > 0 && (
                <Box sx={{ bgcolor: 'grey.50', p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
                        📊 Итоги переговоров:
                    </Typography>

                    <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Всего звонков:</Typography>
                            <Typography variant="body2" fontWeight="500">{calls.length}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Успешные переговоры:</Typography>
                            <Typography variant="body2" fontWeight="500" color="success.main">
                                {successfulNegotiations.length}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Возможна скидка:</Typography>
                            <Typography variant="body2" fontWeight="500" color="primary.main">
                                {completedCalls.filter(c => c.outcome?.canNegotiate).length} объектов
                            </Typography>
                        </Box>
                    </Stack>
                </Box>
            )}
        </Card>
    )
}