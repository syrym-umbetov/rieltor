'use client'

import React from 'react'
import {
    Box,
    Paper,
    Typography,
    Button,
    Chip,
    IconButton,
    Collapse,
    Stack,
    Tooltip
} from '@mui/material'
import {
    KeyboardArrowDown,
    KeyboardArrowUp,
    CheckCircle,
    Clear,
    Share,
    Download,
    Compare,
    Phone,
    SmartToy
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'

interface SelectedProperty {
    id: string | number
    title: string
    price: string
}

interface PropertySelectionPanelProps {
    selectedProperties: SelectedProperty[]
    onClearAll: () => void
    onRemoveProperty: (id: string | number) => void
    expanded?: boolean
    onToggleExpand?: () => void
    onStartNegotiation?: () => void
}

export default function PropertySelectionPanel({
    selectedProperties,
    onClearAll,
    onRemoveProperty,
    expanded = false,
    onToggleExpand,
    onStartNegotiation
}: PropertySelectionPanelProps) {
    if (selectedProperties.length === 0) {
        return null
    }

    const handleShare = () => {
        // Логика для шеринга выбранных объектов
        console.log('Sharing selected properties:', selectedProperties)
    }

    const handleDownload = () => {
        // Логика для скачивания отчета
        console.log('Downloading report for:', selectedProperties)
    }

    const handleCompare = () => {
        // Логика для сравнения объектов
        console.log('Comparing properties:', selectedProperties)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            <Paper
                elevation={4}
                sx={{
                    position: 'sticky',
                    top: 16,
                    zIndex: 100,
                    borderRadius: 3,
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
                    mb: 2
                }}
            >
                {/* Заголовок панели */}
                <Box
                    sx={{
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)'
                        },
                        transition: 'background-color 0.2s ease'
                    }}
                    onClick={onToggleExpand}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CheckCircle sx={{ fontSize: 24 }} />
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                Выбрано объектов: {selectedProperties.length}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                Нажмите для {expanded ? 'скрытия' : 'просмотра'} списка
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* Быстрые действия */}
                        {!expanded && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Tooltip title="🤖 Договориться с продавцами">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onStartNegotiation?.()
                                        }}
                                        sx={{
                                            color: 'white',
                                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                                            '&:hover': {
                                                bgcolor: 'rgba(255, 255, 255, 0.3)',
                                                transform: 'scale(1.1)'
                                            },
                                            width: 32,
                                            height: 32,
                                            border: '1px solid rgba(255, 255, 255, 0.3)'
                                        }}
                                    >
                                        <SmartToy sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title="Поделиться">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleShare()
                                        }}
                                        sx={{
                                            color: 'white',
                                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                                            width: 32,
                                            height: 32
                                        }}
                                    >
                                        <Share sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title="Сравнить">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleCompare()
                                        }}
                                        disabled={selectedProperties.length < 2}
                                        sx={{
                                            color: 'white',
                                            bgcolor: selectedProperties.length >= 2 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                            '&:hover': selectedProperties.length >= 2 ? { bgcolor: 'rgba(255, 255, 255, 0.3)' } : {},
                                            width: 32,
                                            height: 32
                                        }}
                                    >
                                        <Compare sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}

                        <IconButton
                            sx={{
                                color: 'white',
                                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s ease'
                            }}
                        >
                            <KeyboardArrowDown />
                        </IconButton>
                    </Box>
                </Box>

                {/* Развернутый контент */}
                <Collapse in={expanded}>
                    <Box sx={{ px: 2, pb: 2 }}>
                        {/* Список выбранных объектов */}
                        <Stack spacing={1} sx={{ mb: 2, maxHeight: 200, overflow: 'auto' }}>
                            <AnimatePresence>
                                {selectedProperties.map((property, index) => (
                                    <motion.div
                                        key={property.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Box
                                            sx={{
                                                bgcolor: 'rgba(255, 255, 255, 0.15)',
                                                borderRadius: 2,
                                                p: 1.5,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                backdropFilter: 'blur(10px)',
                                                border: '1px solid rgba(255, 255, 255, 0.2)'
                                            }}
                                        >
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 500,
                                                        mb: 0.5,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {index + 1}. {property.title}
                                                </Typography>
                                                <Chip
                                                    label={property.price}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                                                        color: 'white',
                                                        fontSize: '0.7rem',
                                                        height: 20
                                                    }}
                                                />
                                            </Box>

                                            <Tooltip title="Убрать из выбранных">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onRemoveProperty(property.id)}
                                                    sx={{
                                                        color: 'white',
                                                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                        '&:hover': {
                                                            bgcolor: 'rgba(255, 100, 100, 0.8)',
                                                            transform: 'scale(1.1)'
                                                        },
                                                        transition: 'all 0.2s ease',
                                                        width: 28,
                                                        height: 28,
                                                        ml: 1
                                                    }}
                                                >
                                                    <Clear sx={{ fontSize: 14 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </Stack>

                        {/* Действия */}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                                variant="contained"
                                startIcon={<SmartToy />}
                                onClick={onStartNegotiation}
                                sx={{
                                    bgcolor: 'rgba(16, 185, 129, 0.9)', // Green color for AI negotiation
                                    color: 'white',
                                    '&:hover': {
                                        bgcolor: 'rgba(16, 185, 129, 1)',
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 8px 16px rgba(16, 185, 129, 0.4)'
                                    },
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    px: 3,
                                    py: 1,
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                🤖 Договориться с продавцами
                            </Button>

                            <Button
                                variant="contained"
                                startIcon={<Compare />}
                                onClick={handleCompare}
                                disabled={selectedProperties.length < 2}
                                sx={{
                                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    '&:hover': {
                                        bgcolor: 'rgba(255, 255, 255, 0.3)'
                                    },
                                    '&:disabled': {
                                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                                        color: 'rgba(255, 255, 255, 0.5)'
                                    },
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 500
                                }}
                            >
                                Сравнить ({selectedProperties.length})
                            </Button>

                            <Button
                                variant="contained"
                                startIcon={<Share />}
                                onClick={handleShare}
                                sx={{
                                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    '&:hover': {
                                        bgcolor: 'rgba(255, 255, 255, 0.3)'
                                    },
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 500
                                }}
                            >
                                Поделиться
                            </Button>

                            <Button
                                variant="contained"
                                startIcon={<Download />}
                                onClick={handleDownload}
                                sx={{
                                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    '&:hover': {
                                        bgcolor: 'rgba(255, 255, 255, 0.3)'
                                    },
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 500
                                }}
                            >
                                Скачать отчет
                            </Button>

                            <Button
                                variant="outlined"
                                startIcon={<Clear />}
                                onClick={onClearAll}
                                sx={{
                                    borderColor: 'rgba(255, 255, 255, 0.5)',
                                    color: 'white',
                                    '&:hover': {
                                        bgcolor: 'rgba(255, 100, 100, 0.8)',
                                        borderColor: 'transparent'
                                    },
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    ml: 'auto'
                                }}
                            >
                                Очистить все
                            </Button>
                        </Box>
                    </Box>
                </Collapse>
            </Paper>
        </motion.div>
    )
}