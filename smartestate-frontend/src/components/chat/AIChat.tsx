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
    InputAdornment,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Fab
} from '@mui/material'
import {
    Send,
    Mic,
    SmartToy,
    Person,
    ExpandMore,
    ExpandLess,
    AttachFile,
    Psychology,
    AutoAwesome,
    School,
    Groups,
    FilterAlt,
    Search
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import PropertyFiltersDisplay from '../filters/PropertyFiltersDisplay'
import { PropertyFilterExtraction } from '@/types/PropertyFilters'

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
            content: '👋 Привет! Я AI-риелтор SmartEstate с поддержкой нескольких AI!\n\n🤖 Доступные модели:\n• ChatGPT - универсальный и быстрый\n• Gemini - от Google, отличная аналитика\n• Claude - от Anthropic, детальные ответы\n• Консенсус - мнение всех AI сразу\n\n🏠 Чем могу помочь:\n• Найти идеальную квартиру\n• Рассчитать ипотеку и платежи\n• Оценить стоимость недвижимости\n• Записать на просмотр объектов\n• Дать советы по покупке/продаже\n\nВыберите модель AI и задавайте вопросы! 🚀',
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [expanded, setExpanded] = useState(open)
    const [selectedModel, setSelectedModel] = useState('openai')
    const [chatMode, setChatMode] = useState<'single' | 'consensus'>('single')
    const [extractedFilters, setExtractedFilters] = useState<PropertyFilterExtraction | null>(null)
    const [extractingFilters, setExtractingFilters] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        // Скроллим к самому чату, а не к последнему сообщению внутри
        const chatElement = document.getElementById('ai-chat-container')
        if (chatElement) {
            chatElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
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
        const currentInput = input
        setInput('')
        setIsTyping(true)

        try {
            // Отправляем запрос к нашему API с выбранной моделью
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        ...messages.map(msg => ({
                            role: msg.role,
                            content: msg.content
                        })),
                        {
                            role: 'user',
                            content: currentInput
                        }
                    ],
                    model: selectedModel,
                    mode: chatMode
                }),
            })

            const data = await response.json()

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.content,
                timestamp: new Date()
            }

            setMessages(prev => [...prev, aiResponse])
        } catch (error) {
            console.error('Chat error:', error)
            
            // Fallback response при ошибке
            const errorResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Извините, произошла ошибка при обработке вашего запроса. Попробуйте еще раз или используйте быстрые действия ниже.',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorResponse])
        } finally {
            setIsTyping(false)
        }
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

    const handleExtractFilters = async () => {
        if (messages.length <= 1) return // Нет диалога для анализа

        setExtractingFilters(true)
        
        try {
            const response = await fetch('/api/extract-filters', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    model: selectedModel
                }),
            })

            if (response.ok) {
                const extraction: PropertyFilterExtraction = await response.json()
                setExtractedFilters(extraction)
            }
        } catch (error) {
            console.error('Filter extraction error:', error)
        } finally {
            setExtractingFilters(false)
        }
    }

    const quickActions = [
        'Найди 2-комн в Алматы до 40 млн',
        'Лучшие новостройки',
        'Ипотека под 12%',
        'Квартира в аренду',
        'Как оценить квартиру?'
    ]

    return (
        <Box id="ai-chat-container" sx={{ position: 'relative' }}>
            {/* Extracted Filters Display */}
            <PropertyFiltersDisplay 
                extraction={extractedFilters} 
                loading={extractingFilters} 
            />
            
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
                        height: 800,
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

                    {/* AI Model Selector */}
                    <Box sx={{ px: 2, pb: 1, borderTop: 1, borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                            <Typography variant="caption" sx={{ opacity: 0.7, minWidth: 'max-content' }}>
                                AI Модель:
                            </Typography>
                            
                            <ToggleButtonGroup
                                value={chatMode}
                                exclusive
                                onChange={(_, newMode) => newMode && setChatMode(newMode)}
                                size="small"
                                sx={{ mr: 'auto' }}
                            >
                                <ToggleButton value="single" sx={{ px: 1, py: 0.5 }}>
                                    <Tooltip title="Один AI">
                                        <SmartToy sx={{ fontSize: 16 }} />
                                    </Tooltip>
                                </ToggleButton>
                                <ToggleButton value="consensus" sx={{ px: 1, py: 0.5 }}>
                                    <Tooltip title="Консенсус всех AI">
                                        <Groups sx={{ fontSize: 16 }} />
                                    </Tooltip>
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        {chatMode === 'single' && (
                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                <Tooltip title="ChatGPT от OpenAI">
                                    <Chip
                                        icon={<Psychology />}
                                        label="ChatGPT"
                                        onClick={() => setSelectedModel('openai')}
                                        color={selectedModel === 'openai' ? 'primary' : 'default'}
                                        variant={selectedModel === 'openai' ? 'filled' : 'outlined'}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                </Tooltip>
                                
                                <Tooltip title="Gemini от Google">
                                    <Chip
                                        icon={<AutoAwesome />}
                                        label="Gemini"
                                        onClick={() => setSelectedModel('gemini')}
                                        color={selectedModel === 'gemini' ? 'primary' : 'default'}
                                        variant={selectedModel === 'gemini' ? 'filled' : 'outlined'}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                </Tooltip>
                                
                                <Tooltip title="Claude от Anthropic">
                                    <Chip
                                        icon={<School />}
                                        label="Claude"
                                        onClick={() => setSelectedModel('claude')}
                                        color={selectedModel === 'claude' ? 'primary' : 'default'}
                                        variant={selectedModel === 'claude' ? 'filled' : 'outlined'}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                </Tooltip>
                            </Box>
                        )}
                    </Box>

                    {/* Quick Actions */}
                    <Box sx={{ px: 2, pb: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 1 }}>
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
                        
                        {/* Filter Extraction Button */}
                        {messages.length > 1 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<FilterAlt />}
                                    onClick={handleExtractFilters}
                                    disabled={extractingFilters}
                                    size="small"
                                    sx={{ 
                                        borderRadius: 20,
                                        textTransform: 'none'
                                    }}
                                >
                                    {extractingFilters ? (
                                        <>
                                            <CircularProgress size={16} sx={{ mr: 1 }} />
                                            Анализирую...
                                        </>
                                    ) : (
                                        'Извлечь фильтры поиска'
                                    )}
                                </Button>
                            </Box>
                        )}
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