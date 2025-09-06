'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Box, CircularProgress, Typography } from '@mui/material'

// Динамический импорт для избежания SSR проблем с Three.js
const VRSphere = dynamic(() => import('./VRSphere'), { 
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
                <Typography color="white">Загрузка 360° VR...</Typography>
            </Box>
        </Box>
    )
})

interface VRScene {
    id: string
    name: string
    image_360: string
    hotspots?: any[]
    audio_url?: string
    description?: string
}

interface VRTour {
    id: string
    title: string
    vr_scenes: VRScene[]
}

interface VRPlayerThreeProps {
    tour: VRTour
    webXRSupported: boolean
}

export default function VRPlayerThree({ tour, webXRSupported }: VRPlayerThreeProps) {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
    const [allImages, setAllImages] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Собираем все изображения из всех сцен
        const images = tour.vr_scenes.map(scene => scene.image_360)
        setAllImages(images)
        setLoading(false)
        
        console.log('VR Player Three initialized with images:', images)
    }, [tour])

    const handleImageChange = (index: number) => {
        setCurrentSceneIndex(index)
        console.log('Changed to scene:', tour.vr_scenes[index]?.name, 'index:', index)
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
                    <Typography color="white">Подготовка VR тура...</Typography>
                </Box>
            </Box>
        )
    }

    if (allImages.length === 0) {
        return (
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '70vh',
                backgroundColor: '#000' 
            }}>
                <Typography color="white">Нет доступных 360° изображений</Typography>
            </Box>
        )
    }

    const currentScene = tour.vr_scenes[currentSceneIndex]

    return (
        <VRSphere
            images={allImages}
            currentImageIndex={currentSceneIndex}
            onImageChange={handleImageChange}
            sceneName={currentScene?.name || `Сцена ${currentSceneIndex + 1}`}
        />
    )
}