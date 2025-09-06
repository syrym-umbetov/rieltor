'use client'

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Box, Fab, Paper, Typography, Tooltip, Stack } from '@mui/material'
import { 
    NavigateNext, 
    NavigateBefore, 
    CenterFocusStrong,
    Vrpano,
    Info,
    Room
} from '@mui/icons-material'

interface VRScene {
    id: string
    name: string
    image_360: string
    position: { x: number; y: number; z: number }
    hotspots?: Hotspot[]
}

interface Hotspot {
    id: string
    type: 'navigation' | 'info'
    position: { x: number; y: number; z: number }
    title: string
    description?: string
    targetSceneId?: string
}

interface VRUnifiedSpaceProps {
    scenes: VRScene[]
    currentSceneIndex: number
    onSceneChange: (index: number) => void
    onHotspotClick?: (hotspot: Hotspot) => void
}

function VRRoom({ scene, isActive, onHotspotClick }: { 
    scene: VRScene, 
    isActive: boolean, 
    onHotspotClick?: (hotspot: Hotspot) => void 
}) {
    const meshRef = useRef<THREE.Mesh>(null!)
    const texture = useTexture(scene.image_360)
    const [currentOpacity, setCurrentOpacity] = useState(isActive ? 1 : 0)
    
    console.log('VRRoom rendered:', scene.name, 'isActive:', isActive, 'image:', scene.image_360)
    
    // Размер каждой комнаты
    const roomSize = 100
    
    useFrame(() => {
        if (meshRef.current) {
            // Плавный переход opacity
            const targetOpacity = isActive ? 1 : 0
            const material = meshRef.current.material as THREE.MeshBasicMaterial
            
            if (Math.abs(currentOpacity - targetOpacity) > 0.01) {
                const newOpacity = THREE.MathUtils.lerp(currentOpacity, targetOpacity, 0.05)
                setCurrentOpacity(newOpacity)
                material.opacity = newOpacity
            }
            
            // Легкое покачивание активной комнаты
            if (isActive) {
                meshRef.current.rotation.y += 0.0005
            }
        }
    })

    return (
        <group position={[scene.position.x, scene.position.y, scene.position.z]}>
            {/* Основная сфера комнаты */}
            <mesh
                ref={meshRef}
                scale={[-1, 1, 1]}
            >
                <sphereGeometry args={[roomSize, 32, 16]} />
                <meshBasicMaterial 
                    map={texture} 
                    side={THREE.BackSide}
                    transparent={true}
                    opacity={currentOpacity}
                />
            </mesh>
            
            {/* Хотспоты */}
            {scene.hotspots?.map((hotspot) => (
                <VRHotspot
                    key={hotspot.id}
                    hotspot={hotspot}
                    roomPosition={scene.position}
                    onHotspotClick={onHotspotClick}
                    isVisible={isActive}
                />
            ))}
        </group>
    )
}

function VRHotspot({ 
    hotspot, 
    roomPosition, 
    onHotspotClick, 
    isVisible 
}: { 
    hotspot: Hotspot,
    roomPosition: { x: number; y: number; z: number },
    onHotspotClick?: (hotspot: Hotspot) => void,
    isVisible: boolean
}) {
    const meshRef = useRef<THREE.Mesh>(null!)
    const [hovered, setHovered] = useState(false)

    useFrame((state) => {
        if (meshRef.current && isVisible) {
            // Анимация хотспота
            const scale = hovered ? 1.5 : 1
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1
            meshRef.current.scale.setScalar(scale * pulse)
        }
    })

    const worldPosition = useMemo(() => {
        return new THREE.Vector3(
            roomPosition.x + hotspot.position.x * 80,
            roomPosition.y + hotspot.position.y * 80,
            roomPosition.z + hotspot.position.z * 80
        )
    }, [roomPosition, hotspot.position])

    if (!isVisible) return null

    return (
        <mesh
            ref={meshRef}
            position={worldPosition}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onClick={() => onHotspotClick?.(hotspot)}
        >
            <sphereGeometry args={[3, 16, 8]} />
            <meshBasicMaterial 
                color={hotspot.type === 'navigation' ? '#6366f1' : '#10b981'}
                transparent
                opacity={0.8}
            />
            
            {/* Иконка внутри хотспота */}
            <mesh position={[0, 0, 0]}>
                <planeGeometry args={[4, 4]} />
                <meshBasicMaterial 
                    color="white"
                    transparent
                    opacity={1}
                />
            </mesh>
        </mesh>
    )
}

function UnifiedVRScene({ scenes, currentSceneIndex, onSceneChange, onHotspotClick }: VRUnifiedSpaceProps) {
    const { camera } = useThree()
    const [targetPosition, setTargetPosition] = useState<THREE.Vector3 | null>(null)

    // Позиции камеры для каждой сцены
    const cameraPositions = useMemo(() => {
        return scenes.map(scene => new THREE.Vector3(
            scene.position.x, 
            scene.position.y, 
            scene.position.z
        ))
    }, [scenes])

    useFrame(() => {
        if (targetPosition) {
            // Плавное перемещение камеры
            camera.position.lerp(targetPosition, 0.05)
            
            // Если достигли целевой позиции
            if (camera.position.distanceTo(targetPosition) < 1) {
                setTargetPosition(null)
            }
        }
    })

    // Обновляем позицию камеры при смене сцены
    useEffect(() => {
        const newPosition = cameraPositions[currentSceneIndex]
        if (newPosition) {
            setTargetPosition(newPosition.clone())
        }
    }, [currentSceneIndex, cameraPositions])

    const handleHotspotClick = useCallback((hotspot: Hotspot) => {
        if (hotspot.type === 'navigation' && hotspot.targetSceneId) {
            const sceneIndex = scenes.findIndex(s => s.id === hotspot.targetSceneId)
            if (sceneIndex !== -1) {
                onSceneChange(sceneIndex)
            }
        }
        onHotspotClick?.(hotspot)
    }, [scenes, onSceneChange, onHotspotClick])

    console.log('UnifiedVRScene rendering scenes:', scenes.map(s => ({ name: s.name, id: s.id })))
    console.log('Current scene index:', currentSceneIndex)

    return (
        <>
            {scenes.map((scene, index) => {
                console.log(`Rendering scene ${index}:`, scene.name, 'active:', index === currentSceneIndex)
                return (
                    <VRRoom
                        key={scene.id}
                        scene={scene}
                        isActive={index === currentSceneIndex}
                        onHotspotClick={handleHotspotClick}
                    />
                )
            })}
        </>
    )
}

function CameraControls() {
    const { camera, gl } = useThree()
    
    return (
        <OrbitControls
            args={[camera, gl.domElement]}
            enableZoom={true}
            enablePan={true}
            enableDamping={true}
            dampingFactor={0.1}
            autoRotate={false}
            minDistance={5}
            maxDistance={200}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
        />
    )
}

export default function VRUnifiedSpace({ scenes, currentSceneIndex, onSceneChange, onHotspotClick }: VRUnifiedSpaceProps) {
    const goToNext = useCallback(() => {
        const nextIndex = (currentSceneIndex + 1) % scenes.length
        onSceneChange(nextIndex)
    }, [currentSceneIndex, scenes.length, onSceneChange])

    const goToPrev = useCallback(() => {
        const prevIndex = currentSceneIndex === 0 ? scenes.length - 1 : currentSceneIndex - 1
        onSceneChange(prevIndex)
    }, [currentSceneIndex, scenes.length, onSceneChange])

    const resetView = useCallback(() => {
        // Сброс камеры будет реализован в следующей итерации
        console.log('Reset view to current scene')
    }, [])

    const currentScene = scenes[currentSceneIndex]

    return (
        <Box sx={{ 
            position: 'relative', 
            width: '100%', 
            height: '70vh', 
            minHeight: 400,
            backgroundColor: '#000',
            overflow: 'hidden'
        }}>
            {/* Объединенное VR пространство */}
            <Canvas
                camera={{ 
                    position: [0, 0, 0], 
                    fov: 75,
                    near: 0.1,
                    far: 2000
                }}
                style={{ 
                    width: '100%', 
                    height: '100%',
                    cursor: 'grab'
                }}
            >
                <CameraControls />
                <UnifiedVRScene 
                    scenes={scenes}
                    currentSceneIndex={currentSceneIndex}
                    onSceneChange={onSceneChange}
                    onHotspotClick={onHotspotClick}
                />
            </Canvas>

            {/* Информация о текущей сцене */}
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
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Room /> {currentScene?.name}
                </Typography>
                <Typography variant="caption" display="block" gutterBottom>
                    Комната {currentSceneIndex + 1} из {scenes.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Объединенное VR пространство
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
                <Tooltip title="Предыдущая комната">
                    <Fab size="small" onClick={goToPrev}>
                        <NavigateBefore />
                    </Fab>
                </Tooltip>

                <Tooltip title="Следующая комната">
                    <Fab size="small" onClick={goToNext}>
                        <NavigateNext />
                    </Fab>
                </Tooltip>

                <Tooltip title="Сбросить вид">
                    <Fab size="small" onClick={resetView}>
                        <CenterFocusStrong />
                    </Fab>
                </Tooltip>

                <Tooltip title="Объединенный VR">
                    <Fab size="small" color="primary">
                        <Vrpano />
                    </Fab>
                </Tooltip>
            </Paper>

            {/* Навигация по комнатам */}
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
                {scenes.map((scene, index) => (
                    <Tooltip key={scene.id} title={scene.name}>
                        <Box
                            onClick={() => onSceneChange(index)}
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                backgroundColor: index === currentSceneIndex ? '#6366f1' : 'rgba(255,255,255,0.3)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid',
                                borderColor: index === currentSceneIndex ? '#8b5cf6' : 'transparent',
                                '&:hover': {
                                    backgroundColor: '#6366f1',
                                    transform: 'scale(1.1)'
                                }
                            }}
                        >
                            <Room sx={{ color: 'white', fontSize: 20 }} />
                        </Box>
                    </Tooltip>
                ))}
            </Stack>
        </Box>
    )
}