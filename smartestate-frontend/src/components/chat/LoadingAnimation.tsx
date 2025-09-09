'use client'

import React from 'react'
import { Box, Typography, Avatar, Paper, LinearProgress } from '@mui/material'
import { SmartToy, Home, Search, Psychology } from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'

interface LoadingAnimationProps {
    message?: string
    stage?: 'thinking' | 'searching' | 'parsing' | 'formatting'
}

const loadingStages = {
    thinking: { icon: Psychology, text: 'Анализирую запрос', color: '#6366f1' },
    searching: { icon: Search, text: 'Ищу недвижимость', color: '#10b981' },
    parsing: { icon: Home, text: 'Обрабатываю данные', color: '#f59e0b' },
    formatting: { icon: SmartToy, text: 'Формирую ответ', color: '#8b5cf6' }
}

export default function LoadingAnimation({ 
    message = 'AI обрабатывает запрос...', 
    stage = 'thinking' 
}: LoadingAnimationProps) {
    const currentStage = loadingStages[stage]
    const IconComponent = currentStage.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
        >
            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'end' }}>
                <Avatar sx={{ 
                    width: 36, 
                    height: 36, 
                    bgcolor: 'primary.main',
                    boxShadow: '0 4px 8px rgba(99, 102, 241, 0.3)',
                    border: '2px solid white'
                }}>
                    <SmartToy />
                </Avatar>
                
                <Paper sx={{ 
                    p: 3, 
                    bgcolor: 'white', 
                    borderRadius: 3,
                    borderBottomLeftRadius: 0,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '1px solid',
                    borderColor: 'grey.200',
                    minWidth: 280,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Animated background */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: '-100%',
                            width: '100%',
                            height: '100%',
                            background: `linear-gradient(90deg, transparent 0%, ${currentStage.color}20 50%, transparent 100%)`,
                            animation: 'shimmer 2s infinite',
                            '@keyframes shimmer': {
                                '0%': { left: '-100%' },
                                '100%': { left: '100%' }
                            }
                        }}
                    />
                    
                    {/* Content */}
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                        {/* Stage indicator */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Box
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    bgcolor: currentStage.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    animation: 'pulse 1.5s ease-in-out infinite',
                                    '@keyframes pulse': {
                                        '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                                        '50%': { transform: 'scale(1.1)', opacity: 0.8 }
                                    }
                                }}
                            >
                                <IconComponent sx={{ fontSize: 18 }} />
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                {currentStage.text}
                            </Typography>
                        </Box>

                        {/* Progress bar */}
                        <LinearProgress
                            sx={{
                                mb: 2,
                                borderRadius: 2,
                                height: 6,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                    bgcolor: currentStage.color,
                                    borderRadius: 2,
                                    animation: 'loading 2s ease-in-out infinite',
                                    '@keyframes loading': {
                                        '0%': { transform: 'translateX(-100%)' },
                                        '50%': { transform: 'translateX(0%)' },
                                        '100%': { transform: 'translateX(100%)' }
                                    }
                                }
                            }}
                        />

                        {/* Animated dots */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                                {message}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                                {[0, 1, 2].map((i) => (
                                    <Box
                                        key={i}
                                        sx={{
                                            width: 6,
                                            height: 6,
                                            bgcolor: currentStage.color,
                                            borderRadius: '50%',
                                            animation: `bounce 1.4s ease-in-out infinite`,
                                            animationDelay: `${i * 0.16}s`,
                                            '@keyframes bounce': {
                                                '0%, 80%, 100%': {
                                                    transform: 'scale(0)',
                                                    opacity: 0.5
                                                },
                                                '40%': {
                                                    transform: 'scale(1)',
                                                    opacity: 1
                                                }
                                            }
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>

                        {/* Fun facts during loading */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={stage}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: 1, duration: 0.5 }}
                            >
                                <Box sx={{ 
                                    mt: 2, 
                                    p: 1.5, 
                                    bgcolor: `${currentStage.color}10`, 
                                    borderRadius: 2,
                                    border: `1px solid ${currentStage.color}30`
                                }}>
                                    <Typography variant="caption" sx={{ 
                                        color: 'text.secondary',
                                        fontStyle: 'italic',
                                        display: 'block',
                                        lineHeight: 1.4
                                    }}>
                                        {getLoadingTip(stage)}
                                    </Typography>
                                </Box>
                            </motion.div>
                        </AnimatePresence>
                    </Box>
                </Paper>
            </Box>
        </motion.div>
    )
}

function getLoadingTip(stage: string): string {
    const tips = {
        thinking: '💡 Анализирую ваши предпочтения и составляю параметры поиска...',
        searching: '🔍 Просматриваю актуальные предложения на рынке недвижимости...',
        parsing: '⚡ Обрабатываю найденные объекты и проверяю их качество...',
        formatting: '✨ Готовлю красивое отображение результатов для вас...'
    }
    return tips[stage as keyof typeof tips] || tips.thinking
}