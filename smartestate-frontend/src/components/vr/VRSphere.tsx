'use client'

import { useRef, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Box, Fab, Paper, Typography, Tooltip, Stack } from '@mui/material'
import { 
    NavigateNext, 
    NavigateBefore, 
    CenterFocusStrong,
    Vrpano 
} from '@mui/icons-material'

interface VRSphereProps {
    images: string[]
    currentImageIndex: number
    onImageChange: (index: number) => void
    sceneName: string
}

function VRSphere360({ imagePath, onPointerMove }: { imagePath: string, onPointerMove?: (event: any) => void }) {
    const meshRef = useRef<THREE.Mesh>(null!)
    const texture = useTexture(imagePath)

    useFrame(() => {
        // Медленное автовращение если пользователь не взаимодействует
        if (meshRef.current && !onPointerMove) {
            meshRef.current.rotation.y += 0.001
        }
    })

    return (
        <mesh
            ref={meshRef}
            scale={[-1, 1, 1]} // Инвертируем по X для правильного отображения изнутри
            onPointerMove={onPointerMove}
        >
            <sphereGeometry args={[500, 60, 40]} />
            <meshBasicMaterial map={texture} side={THREE.BackSide} />
        </mesh>
    )
}

function CameraControls() {
    const { camera, gl } = useThree()
    
    return (
        <OrbitControls
            args={[camera, gl.domElement]}
            enableZoom={true}
            enablePan={false}
            enableDamping={true}
            dampingFactor={0.1}
            autoRotate={false}
            minDistance={1}
            maxDistance={100}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
        />
    )
}

export default function VRSphere({ images, currentImageIndex, onImageChange, sceneName }: VRSphereProps) {
    const [isUserInteracting, setIsUserInteracting] = useState(false)

    const goToNext = useCallback(() => {
        const nextIndex = (currentImageIndex + 1) % images.length
        onImageChange(nextIndex)
    }, [currentImageIndex, images.length, onImageChange])

    const goToPrev = useCallback(() => {
        const prevIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1
        onImageChange(prevIndex)
    }, [currentImageIndex, images.length, onImageChange])

    const resetView = useCallback(() => {
        // Логика сброса камеры будет добавлена позже
        console.log('Reset view')
    }, [])

    const handlePointerMove = useCallback(() => {
        setIsUserInteracting(true)
        setTimeout(() => setIsUserInteracting(false), 1000)
    }, [])

    return (
        <Box sx={{ 
            position: 'relative', 
            width: '100%', 
            height: '70vh', 
            minHeight: 400,
            backgroundColor: '#000',
            overflow: 'hidden'
        }}>
            {/* 360° Canvas */}
            <Canvas
                camera={{ 
                    position: [0, 0, 0.1], 
                    fov: 75,
                    near: 0.1,
                    far: 1000
                }}
                style={{ 
                    width: '100%', 
                    height: '100%',
                    cursor: 'grab'
                }}
                onPointerDown={() => setIsUserInteracting(true)}
            >
                <CameraControls />
                <VRSphere360 
                    imagePath={images[currentImageIndex]} 
                    onPointerMove={handlePointerMove}
                />
            </Canvas>

            {/* Информация о сцене */}
            <Paper
                sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    p: 2,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    backdropFilter: 'blur(10px)',
                    maxWidth: 250
                }}
            >
                <Typography variant="h6" gutterBottom>
                    {sceneName}
                </Typography>
                <Typography variant="caption" display="block" gutterBottom>
                    Изображение {currentImageIndex + 1} из {images.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Перетаскивайте для поворота обзора
                </Typography>
            </Paper>

            {/* Элементы управления */}
            <Paper
                sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 1,
                    p: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(10px)'
                }}
            >
                <Tooltip title="Предыдущее изображение">
                    <Fab size="small" onClick={goToPrev} disabled={images.length <= 1}>
                        <NavigateBefore />
                    </Fab>
                </Tooltip>

                <Tooltip title="Следующее изображение">
                    <Fab size="small" onClick={goToNext} disabled={images.length <= 1}>
                        <NavigateNext />
                    </Fab>
                </Tooltip>

                <Tooltip title="Сбросить вид">
                    <Fab size="small" onClick={resetView}>
                        <CenterFocusStrong />
                    </Fab>
                </Tooltip>

                <Tooltip title="360° VR Режим">
                    <Fab size="small" color="primary">
                        <Vrpano />
                    </Fab>
                </Tooltip>
            </Paper>

            {/* Индикатор изображений */}
            <Stack
                direction="row"
                spacing={1}
                sx={{
                    position: 'absolute',
                    bottom: 80,
                    left: '50%',
                    transform: 'translateX(-50%)',
                }}
            >
                {images.map((_, index) => (
                    <Box
                        key={index}
                        onClick={() => onImageChange(index)}
                        sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: index === currentImageIndex ? '#6366f1' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                backgroundColor: '#6366f1',
                                transform: 'scale(1.2)'
                            }
                        }}
                    />
                ))}
            </Stack>
        </Box>
    )
}