'use client'

import { useState, useRef, useEffect } from 'react'
import {
    Box,
    Paper,
    TextField,
    IconButton,
    Typography,
    Avatar,
    Chip,
    CircularProgress,
    Collapse,
    Button,
    InputAdornment
} from '@mui/material'
import {
    Send,
    Mic,
    SmartToy,
    Person,
    ExpandMore,
    ExpandLess,
    AttachFile
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

interface AIChatProps {
    open?: boolean
    onClose?: () => void
}

export default function AIChat({ open = true, onClose }: AIChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Привет! Я ваш AI-риелтор. Чем могу помочь?\n\n• Подобрать квартиру\n• Рассчитать ипотеку\n• Оценить недвижимость\n• Записать на просмотр',
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [expanded, setExpanded] = useState(open)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        setExpanded(open)
    }, [open])

    const handleSend = async () => {
        if (!input.trim()) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsTyping(true)

        // Simulate AI response
        setTimeout(() => {
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: generateAIResponse(input),
                timestamp: new Date()
            }
            setMessages(prev => [...prev, aiResponse])
            setIsTyping(false)
        }, 1500)
    }

    const generateAIResponse = (userInput: string) => {
        const lower = userInput.toLowerCase()

        if (lower.includes('квартир') || lower.includes('комн')) {
            return 'Найдено 156 вариантов!\n\nТоп-3 по вашему запросу:\n• 2-комн, 65м² - 35 млн ₸\n• 2-комн, 58м² - 28 млн ₸\n• 2-комн, 70м² - 42 млн ₸\n\nПоказать все?'
        } else if (lower.includes('ипотек')) {
            return 'Лучшие условия:\n• 7-20-25: от 140K ₸/мес\n• Отбасы: от 125K ₸/мес\n• Halyk: от 155K ₸/мес\n\nОформить заявку?'
        }
        return 'Обрабатываю запрос... Могу помочь с поиском недвижимости, расчетом ипотеки или оценкой квартиры.'
    }

    const quickActions = [
        '2-комн в Алматы',
        'Новостройки',
        'Ипотека',
        'Аренда',
        'Оценка'
    ]

    return (
        <Box sx={{ position: 'relative' }}>
            {/* Chat Header */}
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: 'white',
                    cursor: 'pointer'
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                        <SmartToy />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight="600">
                            AI Риелтор SmartEstate
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            <Box component="span" sx={{ color: '#10b981', mr: 0.5 }}>●</Box>
                            Готов помочь
                        </Typography>
                    </Box>
                </Box>
                <IconButton sx={{ color: 'white' }}>
                    {expanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
            </Box>

            {/* Chat Body */}
            <Collapse in={expanded}>
                <Paper
                    sx={{
                        height: 400,
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: 'background.default'
                    }}
                >
                    {/* Messages */}
                    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                        <AnimatePresence>
                            {messages.map((message) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 1,
                                            mb: 2,
                                            flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
                                        }}
                                    >
                                        <Avatar
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                bgcolor: message.role === 'user' ? 'primary.main' : 'grey.300'
                                            }}
                                        >
                                            {message.role === 'user' ? <Person /> : <SmartToy />}
                                        </Avatar>
                                        <Paper
                                            sx={{
                                                p: 1.5,
                                                maxWidth: '80%',
                                                bgcolor: message.role === 'user' ? 'primary.main' : 'white',
                                                color: message.role === 'user' ? 'white' : 'text.primary',
                                                borderRadius: 2,
                                                borderBottomRightRadius: message.role === 'user' ? 0 : 16,
                                                borderBottomLeftRadius: message.role === 'user' ? 16 : 0
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                                {message.content}
                                            </Typography>
                                        </Paper>
                                    </Box>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {isTyping && (
                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.300' }}>
                                    <SmartToy />
                                </Avatar>
                                <Paper sx={{ p: 1.5, bgcolor: 'white', borderRadius: 2 }}>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <CircularProgress size={8} />
                                        <CircularProgress size={8} sx={{ animationDelay: '0.2s' }} />
                                        <CircularProgress size={8} sx={{ animationDelay: '0.4s' }} />
                                    </Box>
                                </Paper>
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Quick Actions */}
                    <Box sx={{ px: 2, pb: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                            {quickActions.map((action) => (
                                <Chip
                                    key={action}
                                    label={action}
                                    onClick={() => setInput(action)}
                                    sx={{
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'primary.light', color: 'white' }
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>

                    {/* Input */}
                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                        <TextField
                            fullWidth
                            placeholder="Напишите запрос..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton size="small" sx={{ mr: 1 }}>
                                            <AttachFile />
                                        </IconButton>
                                        <IconButton size="small" sx={{ mr: 1 }}>
                                            <Mic />
                                        </IconButton>
                                        <IconButton
                                            color="primary"
                                            onClick={handleSend}
                                            disabled={!input.trim()}
                                        >
                                            <Send />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Box>
                </Paper>
            </Collapse>
        </Box>
    )
}