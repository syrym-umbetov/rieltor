'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Box, CircularProgress, Typography, Snackbar, Alert } from '@mui/material'

// Динамический импорт для избежания SSR проблем с Three.js
const VRUnifiedSpace = dynamic(() => import('./VRUnifiedSpace'), { 
    ssr: false,
    loading: () => (
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '70vh',
            backgroundColor: '#000' 
        }}>
            <Box textAlign="center">
                <CircularProgress sx={{ mb: 2 }} />
                <Typography color="white">Создание объединенного VR пространства...</Typography>
            </Box>
        </Box>
    )
})

interface VRScene {
    id: string
    name: string
    image_360: string
    description?: string
}

interface VRTour {
    id: string
    title: string
    vr_scenes: VRScene[]
}

interface Hotspot {
    id: string
    type: 'navigation' | 'info'
    position: { x: number; y: number; z: number }
    title: string
    description?: string
    targetSceneId?: string
}

interface VRPlayerUnifiedProps {
    tour: VRTour
    webXRSupported: boolean
}

export default function VRPlayerUnified({ tour, webXRSupported }: VRPlayerUnifiedProps) {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
    const [vrScenes, setVrScenes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [snackbarMessage, setSnackbarMessage] = useState('')

    useEffect(() => {
        // Создаем объединенные VR сцены с позициями для 3 спален
        const unifiedScenes = tour.vr_scenes.map((scene, index) => {
            // Размещаем 3 спальни в треугольном расположении
            const positions = [
                { x: 0, y: 0, z: 0 },      // Центр - главная спальня
                { x: 300, y: 0, z: 100 },  // Справа-вперед - вторая спальня
                { x: -300, y: 0, z: 100 }  // Слева-вперед - третья спальня
            ]

            // Создаем хотспоты для навигации между комнатами
            const hotspots: Hotspot[] = []
            
            // Добавляем хотспоты для перехода к другим комнатам
            tour.vr_scenes.forEach((targetScene, targetIndex) => {
                if (targetIndex !== index) {
                    const direction = getDirectionToScene(index, targetIndex)
                    hotspots.push({
                        id: `nav-to-${targetScene.id}`,
                        type: 'navigation',
                        position: direction,
                        title: `Перейти в ${targetScene.name}`,
                        targetSceneId: targetScene.id
                    })
                }
            })

            // Добавляем информационный хотспот
            hotspots.push({
                id: `info-${scene.id}`,
                type: 'info',
                position: { x: 0.3, y: 0.2, z: -0.5 },
                title: `Информация о ${scene.name}`,
                description: scene.description || 'Дополнительная информация о комнате'
            })

            return {
                ...scene,
                position: positions[index] || positions[0],
                hotspots
            }
        })

        setVrScenes(unifiedScenes)
        setLoading(false)
        
        console.log('Unified VR space created with scenes:', unifiedScenes)
    }, [tour])

    // Функция для определения направления к другой сцене (для 3 спален)
    const getDirectionToScene = (fromIndex: number, toIndex: number) => {
        // Направления для треугольного расположения 3 спален
        const directionMap = {
            // Из главной спальни (0)
            '0-1': { x: 0.8, y: 0, z: 0.3 },   // К второй спальне (справа-вперед)
            '0-2': { x: -0.8, y: 0, z: 0.3 },  // К третьей спальне (слева-вперед)
            
            // Из второй спальни (1)
            '1-0': { x: -0.8, y: 0, z: -0.3 }, // К главной спальне (слева-назад)
            '1-2': { x: -0.8, y: 0, z: 0 },    // К третьей спальне (влево)
            
            // Из третьей спальни (2)
            '2-0': { x: 0.8, y: 0, z: -0.3 },  // К главной спальне (справа-назад)
            '2-1': { x: 0.8, y: 0, z: 0 }      // К второй спальне (вправо)
        }

        const key = `${fromIndex}-${toIndex}`
        return directionMap[key as keyof typeof directionMap] || { x: 0.5, y: 0, z: 0.5 }
    }

    const handleSceneChange = (index: number) => {
        console.log('=== SCENE CHANGE ===')
        console.log('From scene:', currentSceneIndex, tour.vr_scenes[currentSceneIndex]?.name)
        console.log('To scene:', index, tour.vr_scenes[index]?.name)
        
        setCurrentSceneIndex(index)
        setSnackbarMessage(`Переход в ${tour.vr_scenes[index]?.name}`)
        setSnackbarOpen(true)
        
        console.log('Current scene index updated to:', index)
    }

    const handleHotspotClick = (hotspot: Hotspot) => {
        if (hotspot.type === 'info') {
            setSnackbarMessage(`${hotspot.title}: ${hotspot.description}`)
            setSnackbarOpen(true)
        }
        console.log('Hotspot clicked:', hotspot)
    }

    if (loading) {
        return (
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '70vh',
                backgroundColor: '#000' 
            }}>
                <Box textAlign="center">
                    <CircularProgress sx={{ mb: 2 }} />
                    <Typography color="white">Подготовка объединенного VR тура...</Typography>
                </Box>
            </Box>
        )
    }

    if (vrScenes.length === 0) {
        return (
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '70vh',
                backgroundColor: '#000' 
            }}>
                <Typography color="white">Нет доступных VR сцен</Typography>
            </Box>
        )
    }

    return (
        <>
            <VRUnifiedSpace
                scenes={vrScenes}
                currentSceneIndex={currentSceneIndex}
                onSceneChange={handleSceneChange}
                onHotspotClick={handleHotspotClick}
            />
            
            {/* Уведомления */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert 
                    onClose={() => setSnackbarOpen(false)} 
                    severity="info" 
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </>
    )
}