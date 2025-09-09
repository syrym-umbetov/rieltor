'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@/hooks/useChat'
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
import ReactMarkdown from 'react-markdown'
import PropertyFiltersDisplay from '../filters/PropertyFiltersDisplay'
import PropertyResults from './PropertyResults'
import LoadingAnimation from './LoadingAnimation'
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
    // Используем ChatProvider для работы с backend
    const { currentSession, sendMessage, createSession, isTyping } = useChat()
    const [input, setInput] = useState('')
    const [expanded, setExpanded] = useState(open)
    const [selectedModel, setSelectedModel] = useState('openai')
    const [chatMode, setChatMode] = useState<'single' | 'consensus'>('single')
    const [extractedFilters, setExtractedFilters] = useState<PropertyFilterExtraction | null>(null)
    const [extractingFilters, setExtractingFilters] = useState(false)
    const [loadingStage, setLoadingStage] = useState<'thinking' | 'searching' | 'parsing' | 'formatting'>('thinking')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    
    // Получаем сообщения из текущей сессии
    const messages = currentSession?.messages || []

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

    useEffect(() => {
        // Создаем сессию при первом открытии чата, если её нет
        if (open && !currentSession) {
            createSession()
        }
    }, [open, currentSession, createSession])

    // Автоматическая смена стадий загрузки
    useEffect(() => {
        if (!isTyping) {
            setLoadingStage('thinking')
            return
        }

        const stages: Array<'thinking' | 'searching' | 'parsing' | 'formatting'> = [
            'thinking', 'searching', 'parsing', 'formatting'
        ]
        
        let currentStageIndex = 0
        setLoadingStage(stages[0])

        const interval = setInterval(() => {
            currentStageIndex = (currentStageIndex + 1) % stages.length
            setLoadingStage(stages[currentStageIndex])
        }, 3000) // Меняем стадию каждые 3 секунды

        return () => clearInterval(interval)
    }, [isTyping])

    const handleSend = async () => {
        if (!input.trim()) return

        const currentInput = input
        setInput('')

        try {
            // Используем ChatProvider для отправки сообщения в backend
            await sendMessage(currentInput)
        } catch (error) {
            console.error('Chat error:', error)
            // ChatProvider сам обработает ошибки
        }
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
                    p: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    borderRadius: expanded ? '0' : '16px 16px 0 0',
                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                    },
                    '&:hover::before': {
                        opacity: 1
                    }
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ 
                        bgcolor: 'rgba(255,255,255,0.2)',
                        width: 48,
                        height: 48,
                        border: '2px solid rgba(255,255,255,0.3)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                    }}>
                        <SmartToy sx={{ fontSize: 28 }} />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight="700" sx={{ fontSize: '1.1rem', mb: 0.5 }}>
                            AI Риелтор SmartEstate
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box 
                                component="span" 
                                sx={{ 
                                    width: 8, 
                                    height: 8, 
                                    bgcolor: '#10b981', 
                                    borderRadius: '50%',
                                    boxShadow: '0 0 6px #10b981'
                                }} 
                            />
                            <Typography variant="caption" sx={{ opacity: 0.95, fontWeight: 500 }}>
                                Готов помочь найти недвижимость
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <IconButton 
                    sx={{ 
                        color: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.2)',
                            transform: 'scale(1.1)'
                        },
                        transition: 'all 0.2s ease'
                    }}
                >
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
                    <Box sx={{ 
                        flex: 1, 
                        overflow: 'auto', 
                        p: 2,
                        bgcolor: '#f8fafc',
                        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.05) 0%, rgba(255, 255, 255, 0) 50%),
                                         radial-gradient(circle at 80% 20%, rgba(120, 119, 198, 0.05) 0%, rgba(255, 255, 255, 0) 50%)`,
                    }}>
                        <AnimatePresence>
                            {/* Показываем приветствие, если нет сессии или сообщений */}
                            {(!currentSession || messages.length === 0) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                        <Avatar sx={{ 
                                            width: 40, 
                                            height: 40, 
                                            bgcolor: 'primary.main',
                                            boxShadow: '0 4px 8px rgba(99, 102, 241, 0.3)'
                                        }}>
                                            <SmartToy />
                                        </Avatar>
                                        <Paper sx={{ 
                                            p: 2.5, 
                                            maxWidth: '85%', 
                                            bgcolor: 'white', 
                                            borderRadius: 3, 
                                            borderBottomLeftRadius: 0,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            border: '1px solid',
                                            borderColor: 'primary.light'
                                        }}>
                                            <Typography variant="h6" sx={{ 
                                                fontWeight: 600, 
                                                color: 'primary.main',
                                                mb: 1.5,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1
                                            }}>
                                                👋 Привет! Я AI-риелтор SmartEstate!
                                            </Typography>
                                            
                                            <Typography variant="body2" sx={{ 
                                                color: 'text.secondary',
                                                mb: 2,
                                                lineHeight: 1.6
                                            }}>
                                                🏠 Чем могу помочь:
                                            </Typography>
                                            
                                            <Box component="ul" sx={{ 
                                                m: 0, 
                                                pl: 2,
                                                mb: 2,
                                                '& li': {
                                                    mb: 0.5,
                                                    fontSize: '0.9rem',
                                                    color: 'text.primary'
                                                }
                                            }}>
                                                <li>• Найти идеальную квартиру</li>
                                                <li>• Рассчитать ипотеку и платежи</li>
                                                <li>• Оценить стоимость недвижимости</li>
                                                <li>• Записать на просмотр объектов</li>
                                                <li>• Дать советы по покупке/продаже</li>
                                            </Box>
                                            
                                            <Box sx={{ 
                                                p: 1.5, 
                                                bgcolor: 'primary.light', 
                                                borderRadius: 2,
                                                border: '1px solid',
                                                borderColor: 'primary.main'
                                            }}>
                                                <Typography variant="body2" sx={{ 
                                                    color: 'primary.contrastText',
                                                    fontWeight: 500,
                                                    fontSize: '0.85rem'
                                                }}>
                                                    💡 Просто напишите что ищете, например: "Найди 2-комнатную квартиру в Алматы до 40 млн тенге" 🚀
                                                </Typography>
                                            </Box>
                                        </Paper>
                                    </Box>
                                </motion.div>
                            )}
                            
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
                                                width: 36,
                                                height: 36,
                                                bgcolor: message.role === 'user' ? 'primary.main' : 'primary.main',
                                                boxShadow: message.role === 'user' 
                                                    ? '0 4px 8px rgba(99, 102, 241, 0.3)' 
                                                    : '0 4px 8px rgba(99, 102, 241, 0.3)',
                                                border: message.role === 'user' ? 'none' : '2px solid white'
                                            }}
                                        >
                                            {message.role === 'user' ? <Person /> : <SmartToy />}
                                        </Avatar>
                                        <Paper
                                            sx={{
                                                p: message.role === 'user' ? 2 : 0,
                                                maxWidth: message.role === 'user' ? '70%' : '100%',
                                                bgcolor: message.role === 'user' ? 'primary.main' : 'transparent',
                                                color: message.role === 'user' ? 'white' : 'text.primary',
                                                borderRadius: 3,
                                                borderBottomRightRadius: message.role === 'user' ? 0 : 16,
                                                borderBottomLeftRadius: message.role === 'user' ? 16 : 0,
                                                boxShadow: message.role === 'user' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                                                border: message.role === 'user' ? 'none' : '1px solid transparent'
                                            }}
                                        >
                                            {message.role === 'assistant' ? (
                                                <PropertyResults content={message.content} />
                                            ) : (
                                                <Typography 
                                                    variant="body1" 
                                                    sx={{ 
                                                        whiteSpace: 'pre-line',
                                                        fontWeight: 500,
                                                        fontSize: '0.95rem',
                                                        lineHeight: 1.4
                                                    }}
                                                >
                                                    {message.content}
                                                </Typography>
                                            )}
                                        </Paper>
                                    </Box>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {isTyping && (
                            <LoadingAnimation 
                                message="Обрабатываю ваш запрос..."
                                stage={loadingStage}
                            />
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
                    <Box sx={{ px: 2, pb: 1, borderTop: '1px solid', borderColor: 'grey.100', bgcolor: 'white' }}>
                        <Typography variant="caption" sx={{ 
                            display: 'block', 
                            color: 'text.secondary', 
                            mb: 1, 
                            fontWeight: 500,
                            mt: 1
                        }}>
                            💡 Популярные запросы:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 1 }}>
                            {quickActions.map((action) => (
                                <Chip
                                    key={action}
                                    label={action}
                                    onClick={() => setInput(action)}
                                    sx={{
                                        cursor: 'pointer',
                                        borderRadius: 3,
                                        fontSize: '0.8rem',
                                        height: 32,
                                        whiteSpace: 'nowrap',
                                        '&:hover': { 
                                            bgcolor: 'primary.main', 
                                            color: 'white',
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 4px 8px rgba(99, 102, 241, 0.3)'
                                        },
                                        transition: 'all 0.2s ease'
                                    }}
                                />
                            ))}
                        </Box>
                        
                        {/* Filter Extraction Button */}
                        {messages.length > 1 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<FilterAlt />}
                                    onClick={handleExtractFilters}
                                    disabled={extractingFilters}
                                    size="small"
                                    sx={{ 
                                        borderRadius: 3,
                                        textTransform: 'none',
                                        fontWeight: 500,
                                        px: 2,
                                        py: 1,
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        '&:hover': {
                                            bgcolor: 'primary.main',
                                            color: 'white',
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 4px 8px rgba(99, 102, 241, 0.3)'
                                        },
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {extractingFilters ? (
                                        <>
                                            <Box sx={{
                                                width: 16,
                                                height: 16,
                                                mr: 1,
                                                borderRadius: '50%',
                                                border: '2px solid',
                                                borderColor: 'primary.main',
                                                borderTopColor: 'transparent',
                                                animation: 'spin 1s linear infinite',
                                                '@keyframes spin': {
                                                    '0%': { transform: 'rotate(0deg)' },
                                                    '100%': { transform: 'rotate(360deg)' }
                                                }
                                            }} />
                                            Анализирую диалог...
                                        </>
                                    ) : (
                                        'Извлечь фильтры поиска'
                                    )}
                                </Button>
                            </Box>
                        )}
                    </Box>

                    {/* Input */}
                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'white' }}>
                        <TextField
                            fullWidth
                            placeholder="Напишите запрос..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            multiline
                            maxRows={4}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: 'grey.50',
                                    border: '2px solid transparent',
                                    '&:hover': {
                                        bgcolor: 'grey.100',
                                        borderColor: 'primary.light'
                                    },
                                    '&.Mui-focused': {
                                        bgcolor: 'white',
                                        borderColor: 'primary.main',
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                    }
                                },
                                '& .MuiInputBase-input': {
                                    fontSize: '0.95rem',
                                    py: 1.5
                                }
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton 
                                            size="small" 
                                            sx={{ 
                                                mr: 0.5, 
                                                color: 'text.secondary',
                                                '&:hover': { color: 'primary.main', bgcolor: 'primary.light' }
                                            }}
                                        >
                                            <AttachFile sx={{ fontSize: 20 }} />
                                        </IconButton>
                                        <IconButton 
                                            size="small" 
                                            sx={{ 
                                                mr: 0.5, 
                                                color: 'text.secondary',
                                                '&:hover': { color: 'primary.main', bgcolor: 'primary.light' }
                                            }}
                                        >
                                            <Mic sx={{ fontSize: 20 }} />
                                        </IconButton>
                                        <IconButton
                                            onClick={handleSend}
                                            disabled={!input.trim()}
                                            sx={{
                                                bgcolor: input.trim() ? 'primary.main' : 'grey.300',
                                                color: 'white',
                                                width: 36,
                                                height: 36,
                                                '&:hover': {
                                                    bgcolor: input.trim() ? 'primary.dark' : 'grey.400',
                                                    transform: input.trim() ? 'scale(1.05)' : 'none'
                                                },
                                                '&:disabled': {
                                                    bgcolor: 'grey.300',
                                                    color: 'grey.500'
                                                },
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <Send sx={{ fontSize: 18 }} />
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