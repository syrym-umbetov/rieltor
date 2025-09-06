'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Box, Typography, Fab, Tooltip, Slider, Paper } from '@mui/material'
import { 
    Vrpano, 
    Fullscreen, 
    FullscreenExit, 
    NavigateNext, 
    NavigateBefore,
    PlayArrow,
    Pause,
    CenterFocusStrong
} from '@mui/icons-material'

interface VRScene {
    id: string
    name: string
    image_360: string
    hotspots: VRHotspot[]
    audio_url?: string
    description?: string
}

interface VRHotspot {
    id: string
    type: 'navigation' | 'info' | 'media'
    position: { x: number; y: number; z: number }
    title: string
    description?: string
    target_scene_id?: string
    media_url?: string
}

interface VRTour {
    id: string
    title: string
    vr_scenes: VRScene[]
}

interface VRPlayerProps {
    tour: VRTour
    webXRSupported: boolean
}

interface ViewParams {
    rotation: { x: number; y: number }
    zoom: number
    fov: number
}

export default function VRPlayer({ tour, webXRSupported }: VRPlayerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const animationFrameRef = useRef<number>()
    const imageRef = useRef<HTMLImageElement | null>(null)
    
    const [currentScene, setCurrentScene] = useState(0)
    const [isVRActive, setIsVRActive] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [viewParams, setViewParams] = useState<ViewParams>({
        rotation: { x: 0, y: 0 },
        zoom: 1,
        fov: 90
    })
    const [isDragging, setIsDragging] = useState(false)
    const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 })
    const [vrSession, setVrSession] = useState<XRSession | null>(null)
    const [isAutoRotate, setIsAutoRotate] = useState(false)
    const [hotspotHovered, setHotspotHovered] = useState<string | null>(null)
    const [isImageLoaded, setIsImageLoaded] = useState(false)


    useEffect(() => {
        initializePlayer()
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            if (vrSession) {
                vrSession.end()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentScene])

    // Автоповорот
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isAutoRotate && !isDragging && !isVRActive) {
            interval = setInterval(() => {
                setViewParams(prev => ({
                    ...prev,
                    rotation: {
                        ...prev.rotation,
                        y: (prev.rotation.y + 0.2) % 360
                    }
                }))
            }, 16) // ~60 FPS
        }
        return () => clearInterval(interval)
    }, [isAutoRotate, isDragging, isVRActive])

    const initializePlayer = async () => {
        console.log('Initializing VR Player for tour:', tour.title)
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) {
            console.error('Canvas or container not available')
            return
        }

        console.log('Canvas and container available, setting up...')

        // Настройка размеров canvas
        const resizeCanvas = () => {
            const rect = container.getBoundingClientRect()
            canvas.width = rect.width
            canvas.height = rect.height
            canvas.style.width = rect.width + 'px'
            canvas.style.height = rect.height + 'px'
            console.log('Canvas resized to:', rect.width, 'x', rect.height)
        }

        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)

        console.log('Loading initial scene...')
        // Загрузка первой сцены
        await loadScene(tour.vr_scenes[currentScene])
        console.log('Scene loaded, starting render loop...')
        
        // Небольшая задержка чтобы состояние обновилось
        setTimeout(() => {
            console.log('Starting render loop after delay...')
            startRenderLoop()
        }, 100)

        return () => {
            window.removeEventListener('resize', resizeCanvas)
        }
    }

    const loadScene = async (scene: VRScene) => {
        console.log('Loading VR scene:', scene.name, scene.image_360)
        setIsImageLoaded(false)
        
        return new Promise<void>((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            
            img.onload = () => {
                console.log('VR scene image loaded successfully:', scene.name)
                imageRef.current = img
                setIsImageLoaded(true)
                // Сброс параметров просмотра при смене сцены
                setViewParams(prev => ({
                    ...prev,
                    rotation: { x: 0, y: 0 },
                    zoom: 1
                }))
                resolve()
            }
            
            img.onerror = (error) => {
                console.error('Failed to load 360° image:', scene.image_360, error)
                console.log('Creating fallback texture for:', scene.name)
                // Создаем fallback изображение
                createFallbackTexture(scene.name)
                resolve()
            }

            // Пробуем загрузить реальное изображение, если не получается - используем fallback
            console.log('Trying to load real image:', scene.image_360)
            img.src = scene.image_360
        })
    }

    const createFallbackTexture = (sceneName: string) => {
        console.log('Creating fallback texture for:', sceneName)
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = 2048
        tempCanvas.height = 1024
        const ctx = tempCanvas.getContext('2d')!
        
        // Создаем градиентный фон
        const gradient = ctx.createLinearGradient(0, 0, tempCanvas.width, tempCanvas.height)
        gradient.addColorStop(0, '#6366f1')
        gradient.addColorStop(0.5, '#8b5cf6')
        gradient.addColorStop(1, '#ec4899')
        
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
        
        // Добавляем текст
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = 'bold 48px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(`VR Сцена: ${sceneName}`, tempCanvas.width / 2, tempCanvas.height / 2 - 50)
        ctx.font = '32px Arial'
        ctx.fillText('Изображение загружается...', tempCanvas.width / 2, tempCanvas.height / 2 + 20)
        
        // Добавляем сетку для имитации 360° пространства
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'
        ctx.lineWidth = 2
        for (let i = 0; i < 16; i++) {
            const x = (tempCanvas.width / 16) * i
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, tempCanvas.height)
            ctx.stroke()
        }
        for (let i = 0; i < 8; i++) {
            const y = (tempCanvas.height / 8) * i
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(tempCanvas.width, y)
            ctx.stroke()
        }

        // Вместо создания изображения через toDataURL, используем сам canvas
        imageRef.current = tempCanvas as any
        setIsImageLoaded(true)
        console.log('Fallback texture created and set')
    }

    const createPlaceholderDataURL = (sceneName: string): string => {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 256
        const ctx = canvas.getContext('2d')!
        
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        gradient.addColorStop(0, '#667eea')
        gradient.addColorStop(1, '#764ba2')
        
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        ctx.fillStyle = 'white'
        ctx.font = '24px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(sceneName, canvas.width / 2, canvas.height / 2)
        
        return canvas.toDataURL()
    }

    const startRenderLoop = () => {
        const render = () => {
            renderPanorama()
            animationFrameRef.current = requestAnimationFrame(render)
        }
        render()
    }

    const renderPanorama = () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        const img = imageRef.current
        
        if (!canvas || !ctx) {
            console.log('Canvas or context not available')
            return
        }
        
        if (!img) {
            console.log('No image available yet')
            return
        }

        const { width, height } = canvas
        const { rotation, zoom, fov } = viewParams

        console.log('Rendering panorama:', width, 'x', height, 'rotation:', rotation, 'zoom:', zoom)

        // Очищаем canvas
        ctx.clearRect(0, 0, width, height)

        // Применяем трансформации для симуляции 360° вида
        ctx.save()
        
        // Центрируем изображение
        ctx.translate(width / 2, height / 2)
        
        // Применяем поворот
        ctx.rotate((rotation.y * Math.PI) / 180)
        
        // Применяем масштабирование
        const scale = zoom * Math.max(width / img.width, height / img.height) * (fov / 90)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        
        // Смещение по вертикали
        const offsetY = (rotation.x * scale) / 10
        
        // Рисуем панораму
        ctx.drawImage(
            img,
            -scaledWidth / 2,
            -scaledHeight / 2 + offsetY,
            scaledWidth,
            scaledHeight
        )
        
        ctx.restore()

        // Рисуем хотспоты
        drawHotspots(ctx, width, height)
        
        // Рисуем интерфейс
        drawUI(ctx, width, height)
    }

    const drawHotspots = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const scene = tour.vr_scenes[currentScene]
        if (!scene?.hotspots) return

        scene.hotspots.forEach(hotspot => {
            // Конвертируем 3D позицию в 2D координаты экрана с учетом поворота
            const adjustedX = hotspot.position.x + (viewParams.rotation.y / 360)
            const adjustedY = hotspot.position.y + (viewParams.rotation.x / 180)
            
            const screenX = width * 0.5 + (adjustedX * width * 0.4 * viewParams.zoom)
            const screenY = height * 0.5 + (adjustedY * height * 0.4 * viewParams.zoom)

            // Проверяем, находится ли хотспот в видимой области
            if (screenX < -50 || screenX > width + 50 || screenY < -50 || screenY > height + 50) {
                return
            }

            // Анимация для наведенного хотспота
            const isHovered = hotspotHovered === hotspot.id
            const size = isHovered ? 30 : 25
            const alpha = isHovered ? 1 : 0.8

            // Рисуем хотспот с анимированным эффектом
            ctx.save()
            ctx.globalAlpha = alpha

            // Тень
            ctx.beginPath()
            ctx.arc(screenX + 2, screenY + 2, size, 0, 2 * Math.PI)
            ctx.fillStyle = 'rgba(0,0,0,0.3)'
            ctx.fill()

            // Основной круг хотспота
            ctx.beginPath()
            ctx.arc(screenX, screenY, size, 0, 2 * Math.PI)
            ctx.fillStyle = getHotspotColor(hotspot.type)
            ctx.fill()
            ctx.strokeStyle = 'white'
            ctx.lineWidth = 3
            ctx.stroke()

            // Иконка
            ctx.fillStyle = 'white'
            ctx.font = `${size * 0.6}px Arial`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            const icon = getHotspotIcon(hotspot.type)
            ctx.fillText(icon, screenX, screenY)

            // Пульсирующий эффект для активных хотспотов
            if (isHovered) {
                const pulseRadius = size + 10 + Math.sin(Date.now() / 200) * 5
                ctx.beginPath()
                ctx.arc(screenX, screenY, pulseRadius, 0, 2 * Math.PI)
                ctx.strokeStyle = getHotspotColor(hotspot.type)
                ctx.lineWidth = 2
                ctx.globalAlpha = 0.5
                ctx.stroke()
            }

            ctx.restore()

            // Подсказка при наведении
            if (isHovered) {
                drawTooltip(ctx, screenX, screenY - size - 10, hotspot.title)
            }
        })
    }

    const drawTooltip = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string) => {
        const padding = 8
        const fontSize = 14
        ctx.font = `${fontSize}px Arial`
        const textWidth = ctx.measureText(text).width
        const tooltipWidth = textWidth + padding * 2
        const tooltipHeight = fontSize + padding * 2

        // Фон подсказки
        ctx.fillStyle = 'rgba(0,0,0,0.8)'
        ctx.roundRect(
            x - tooltipWidth / 2,
            y - tooltipHeight,
            tooltipWidth,
            tooltipHeight,
            4
        )
        ctx.fill()

        // Текст подсказки
        ctx.fillStyle = 'white'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, x, y - tooltipHeight / 2)
    }

    const drawUI = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        // Индикатор загрузки
        if (!isImageLoaded) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)'
            ctx.fillRect(0, 0, width, height)
            
            ctx.fillStyle = 'white'
            ctx.font = '24px Arial'
            ctx.textAlign = 'center'
            ctx.fillText('Загрузка VR сцены...', width / 2, height / 2)
            
            // Спиннер
            const centerX = width / 2
            const centerY = height / 2 + 50
            const angle = (Date.now() / 10) % 360
            
            ctx.beginPath()
            ctx.arc(centerX, centerY, 20, 0, (angle * Math.PI) / 180)
            ctx.strokeStyle = '#6366f1'
            ctx.lineWidth = 4
            ctx.lineCap = 'round'
            ctx.stroke()
        }

        // Compass (компас)
        drawCompass(ctx, width - 80, 80)
    }

    const drawCompass = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
        const radius = 30
        
        ctx.save()
        
        // Фон компаса
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, 2 * Math.PI)
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fill()
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 2
        ctx.stroke()
        
        // Стрелка компаса (указывает направление обзора)
        ctx.translate(x, y)
        ctx.rotate((-viewParams.rotation.y * Math.PI) / 180)
        
        ctx.beginPath()
        ctx.moveTo(0, -radius * 0.7)
        ctx.lineTo(-radius * 0.2, radius * 0.3)
        ctx.lineTo(0, radius * 0.5)
        ctx.lineTo(radius * 0.2, radius * 0.3)
        ctx.closePath()
        
        ctx.fillStyle = '#6366f1'
        ctx.fill()
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 1
        ctx.stroke()
        
        ctx.restore()
    }

    const getHotspotColor = (type: string): string => {
        switch (type) {
            case 'navigation': return '#6366f1'
            case 'info': return '#10b981'
            case 'media': return '#f59e0b'
            default: return '#6b7280'
        }
    }

    const getHotspotIcon = (type: string): string => {
        switch (type) {
            case 'navigation': return '→'
            case 'info': return 'i'
            case 'media': return '▶'
            default: return '?'
        }
    }

    // Обработчики событий мыши и касаний
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        setIsDragging(true)
        setIsAutoRotate(false)
        setLastMouse({ x: e.clientX, y: e.clientY })
    }, [])

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging) {
            // Проверяем наведение на хотспоты
            checkHotspotHover(e.clientX, e.clientY)
            return
        }

        const deltaX = e.clientX - lastMouse.x
        const deltaY = e.clientY - lastMouse.y

        setViewParams(prev => ({
            ...prev,
            rotation: {
                x: Math.max(-90, Math.min(90, prev.rotation.x - deltaY * 0.5)),
                y: (prev.rotation.y - deltaX * 0.5) % 360
            }
        }))

        setLastMouse({ x: e.clientX, y: e.clientY })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDragging, lastMouse])

    const handlePointerUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.1 : -0.1
        setViewParams(prev => ({
            ...prev,
            zoom: Math.max(0.5, Math.min(3, prev.zoom + delta))
        }))
    }, [])

    const checkHotspotHover = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = clientX - rect.left
        const y = clientY - rect.top

        const scene = tour.vr_scenes[currentScene]
        if (!scene?.hotspots) return

        let hoveredHotspot = null

        for (const hotspot of scene.hotspots) {
            const adjustedX = hotspot.position.x + (viewParams.rotation.y / 360)
            const adjustedY = hotspot.position.y + (viewParams.rotation.x / 180)
            
            const screenX = canvas.width * 0.5 + (adjustedX * canvas.width * 0.4 * viewParams.zoom)
            const screenY = canvas.height * 0.5 + (adjustedY * canvas.height * 0.4 * viewParams.zoom)

            const distance = Math.sqrt((x - screenX) ** 2 + (y - screenY) ** 2)
            if (distance < 30) {
                hoveredHotspot = hotspot.id
                break
            }
        }

        setHotspotHovered(hoveredHotspot)
    }

    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
        if (isDragging) return

        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const scene = tour.vr_scenes[currentScene]
        if (!scene?.hotspots) return

        for (const hotspot of scene.hotspots) {
            const adjustedX = hotspot.position.x + (viewParams.rotation.y / 360)
            const adjustedY = hotspot.position.y + (viewParams.rotation.x / 180)
            
            const screenX = canvas.width * 0.5 + (adjustedX * canvas.width * 0.4 * viewParams.zoom)
            const screenY = canvas.height * 0.5 + (adjustedY * canvas.height * 0.4 * viewParams.zoom)
            
            const distance = Math.sqrt((x - screenX) ** 2 + (y - screenY) ** 2)
            if (distance < 30) {
                handleHotspotClick(hotspot)
                break
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDragging, currentScene, viewParams])

    const handleHotspotClick = (hotspot: VRHotspot) => {
        if (hotspot.type === 'navigation' && hotspot.target_scene_id) {
            const sceneIndex = tour.vr_scenes.findIndex(scene => scene.id === hotspot.target_scene_id)
            if (sceneIndex !== -1) {
                setCurrentScene(sceneIndex)
            }
        } else if (hotspot.type === 'info') {
            alert(`${hotspot.title}\n\n${hotspot.description || 'Дополнительная информация недоступна'}`)
        }
    }

    // WebXR функции
    const startWebXR = async () => {
        if (!webXRSupported || !navigator.xr) return

        try {
            const session = await navigator.xr.requestSession('immersive-vr', {
                requiredFeatures: ['local-floor']
            })
            
            setVrSession(session)
            setIsVRActive(true)

            session.addEventListener('end', () => {
                setIsVRActive(false)
                setVrSession(null)
            })

            // Здесь должна быть полная реализация WebXR рендеринга с WebGL
            // Для демонстрации показываем уведомление
            console.log('VR session started!')
            
        } catch (error) {
            console.error('Failed to start WebXR session:', error)
            alert('Не удалось запустить VR режим. Убедитесь, что VR устройство подключено и браузер поддерживает WebXR.')
        }
    }

    const exitWebXR = () => {
        if (vrSession) {
            vrSession.end()
        }
    }

    // Управление сценами
    const goToNextScene = () => {
        setCurrentScene(prev => (prev + 1) % tour.vr_scenes.length)
    }

    const goToPrevScene = () => {
        setCurrentScene(prev => prev === 0 ? tour.vr_scenes.length - 1 : prev - 1)
    }

    const toggleAutoRotate = () => {
        setIsAutoRotate(prev => !prev)
    }

    const resetView = () => {
        setViewParams({
            rotation: { x: 0, y: 0 },
            zoom: 1,
            fov: 90
        })
    }

    const toggleFullscreen = () => {
        const container = containerRef.current
        if (!container) return

        if (!isFullscreen) {
            if (container.requestFullscreen) {
                container.requestFullscreen()
                setIsFullscreen(true)
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen()
                setIsFullscreen(false)
            }
        }
    }

    // Добавим расширение CanvasRenderingContext2D для roundRect (если не поддерживается)
    useEffect(() => {
        if (!CanvasRenderingContext2D.prototype.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
                if (w < 2 * r) r = w / 2
                if (h < 2 * r) r = h / 2
                this.beginPath()
                this.moveTo(x + r, y)
                this.arcTo(x + w, y, x + w, y + h, r)
                this.arcTo(x + w, y + h, x, y + h, r)
                this.arcTo(x, y + h, x, y, r)
                this.arcTo(x, y, x + w, y, r)
                this.closePath()
                return this
            }
        }
    }, [])

    return (
        <Box
            ref={containerRef}
            sx={{
                position: 'relative',
                width: '100%',
                height: '70vh',
                minHeight: 400,
                backgroundColor: '#000',
                overflow: 'hidden',
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
        >
            {/* VR Canvas */}
            <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onClick={handleCanvasClick}
                onWheel={handleWheel}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    touchAction: 'none'
                }}
            />

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
                    {tour.vr_scenes[currentScene]?.name || 'VR Сцена'}
                </Typography>
                <Typography variant="caption" display="block" gutterBottom>
                    Сцена {currentScene + 1} из {tour.vr_scenes.length}
                </Typography>
                {tour.vr_scenes[currentScene]?.description && (
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {tour.vr_scenes[currentScene].description}
                    </Typography>
                )}
            </Paper>

            {/* Основные элементы управления */}
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
                <Tooltip title="Предыдущая сцена">
                    <Fab size="small" onClick={goToPrevScene} disabled={tour.vr_scenes.length <= 1}>
                        <NavigateBefore />
                    </Fab>
                </Tooltip>

                <Tooltip title="Следующая сцена">
                    <Fab size="small" onClick={goToNextScene} disabled={tour.vr_scenes.length <= 1}>
                        <NavigateNext />
                    </Fab>
                </Tooltip>

                <Tooltip title="Сбросить вид">
                    <Fab size="small" onClick={resetView}>
                        <CenterFocusStrong />
                    </Fab>
                </Tooltip>

                <Tooltip title={isAutoRotate ? "Остановить автоповорот" : "Автоповорот"}>
                    <Fab 
                        size="small" 
                        onClick={toggleAutoRotate}
                        color={isAutoRotate ? "primary" : "default"}
                    >
                        {isAutoRotate ? <Pause /> : <PlayArrow />}
                    </Fab>
                </Tooltip>

                <Tooltip title={isFullscreen ? "Выход из полноэкранного режима" : "Полноэкранный режим"}>
                    <Fab size="small" onClick={toggleFullscreen}>
                        {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                    </Fab>
                </Tooltip>

                {webXRSupported && (
                    <Tooltip title={isVRActive ? "Выйти из VR" : "Запустить VR режим"}>
                        <Fab
                            size="small"
                            color={isVRActive ? "secondary" : "primary"}
                            onClick={isVRActive ? exitWebXR : startWebXR}
                        >
                            <Vrpano />
                        </Fab>
                    </Tooltip>
                )}
            </Paper>

            {/* Управление масштабированием */}
            <Paper
                sx={{
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    p: 2,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(10px)',
                    width: 200
                }}
            >
                <Typography variant="caption" color="white" gutterBottom>
                    Масштаб: {Math.round(viewParams.zoom * 100)}%
                </Typography>
                <Slider
                    size="small"
                    value={viewParams.zoom}
                    min={0.5}
                    max={3}
                    step={0.1}
                    onChange={(_, value) => setViewParams(prev => ({ ...prev, zoom: value as number }))}
                    sx={{ color: '#6366f1' }}
                />
            </Paper>
        </Box>
    )
}