'use client'

import { useState, useCallback, useRef } from 'react'
import type { CallResult, CallStatus } from '@/components/negotiation/CallProgressTracker'

export interface NegotiationData {
    properties: Array<{
        id: string | number
        title: string
        price: string
        image?: string
        link?: string
        address?: string
    }>
    clientInfo: {
        name: string
        phone: string
        budget: string
        preferences: string[]
    }
    negotiationGoals: {
        priceReduction: boolean
        viewing: boolean
        quickDecision: boolean
    }
}

export function useNegotiation() {
    const [isNegotiating, setIsNegotiating] = useState(false)
    const [calls, setCalls] = useState<CallResult[]>([])
    const [currentCall, setCurrentCall] = useState<CallResult | null>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // Симулируем реальные звонки и переговоры
    const simulateCall = useCallback((property: any, index: number): Promise<CallResult> => {
        return new Promise((resolve) => {
            const startTime = new Date()

            // Имитируем случайную длительность звонка (30-180 секунд)
            const duration = Math.floor(Math.random() * 150) + 30

            // Имитируем разные исходы
            const outcomes = [
                {
                    status: 'completed' as CallStatus,
                    outcome: {
                        isAvailable: true,
                        canNegotiate: true,
                        proposedPrice: `${Math.floor(parseInt(property.price.replace(/[^\d]/g, '')) * 0.95 / 1000000)} млн ₸`,
                        viewingTime: 'Завтра в 14:00',
                        sellerResponse: 'Готов обсудить цену, квартира свободна',
                        nextStep: 'Записаться на просмотр и обсудить окончательную цену'
                    }
                },
                {
                    status: 'completed' as CallStatus,
                    outcome: {
                        isAvailable: true,
                        canNegotiate: false,
                        viewingTime: 'На выходных',
                        sellerResponse: 'Цена окончательная, но можем показать квартиру',
                        nextStep: 'Записаться на просмотр'
                    }
                },
                {
                    status: 'completed' as CallStatus,
                    outcome: {
                        isAvailable: false,
                        canNegotiate: false,
                        sellerResponse: 'Квартира уже продана на прошлой неделе',
                        nextStep: 'Искать другие варианты'
                    }
                },
                {
                    status: 'no_answer' as CallStatus
                },
                {
                    status: 'failed' as CallStatus
                }
            ]

            // 70% успешных звонков, 20% не отвечают, 10% ошибка
            let selectedOutcome
            const rand = Math.random()
            if (rand < 0.7) {
                selectedOutcome = outcomes[Math.floor(Math.random() * 3)] // Первые 3 - успешные
            } else if (rand < 0.9) {
                selectedOutcome = outcomes[3] // Не отвечает
            } else {
                selectedOutcome = outcomes[4] // Ошибка
            }

            setTimeout(() => {
                const result: CallResult = {
                    property: {
                        id: property.id,
                        title: property.title,
                        price: property.price,
                        address: property.address
                    },
                    status: selectedOutcome.status,
                    startTime,
                    endTime: new Date(),
                    duration,
                    outcome: selectedOutcome.outcome,
                    transcript: selectedOutcome.outcome ? [
                        'ИИ: Здравствуйте! Звоню по поводу квартиры на сайте.',
                        'Продавец: Да, слушаю.',
                        `ИИ: ${selectedOutcome.outcome.sellerResponse}`,
                        'Продавец: ' + selectedOutcome.outcome.sellerResponse
                    ] : undefined
                }

                resolve(result)
            }, duration * 20) // Ускоряем для демо (20ms вместо 1000ms)
        })
    }, [])

    const startNegotiation = useCallback(async (negotiationData: NegotiationData) => {
        setIsNegotiating(true)
        setCalls([])

        // Инициализируем звонки
        const initialCalls: CallResult[] = negotiationData.properties.map(property => ({
            property: {
                id: property.id,
                title: property.title,
                price: property.price,
                address: property.address
            },
            status: 'pending' as CallStatus
        }))

        setCalls(initialCalls)

        // Начинаем звонки последовательно с небольшими задержками
        for (let i = 0; i < negotiationData.properties.length; i++) {
            const property = negotiationData.properties[i]

            // Обновляем статус на "звонит"
            setCalls(prevCalls =>
                prevCalls.map(call =>
                    call.property.id === property.id
                        ? { ...call, status: 'calling' as CallStatus }
                        : call
                )
            )

            setCurrentCall(initialCalls[i])

            try {
                const result = await simulateCall(property, i)

                // Обновляем результат звонка
                setCalls(prevCalls =>
                    prevCalls.map(call =>
                        call.property.id === property.id ? result : call
                    )
                )

                // Небольшая пауза между звонками
                if (i < negotiationData.properties.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000))
                }
            } catch (error) {
                // Обработка ошибки звонка
                setCalls(prevCalls =>
                    prevCalls.map(call =>
                        call.property.id === property.id
                            ? { ...call, status: 'failed' as CallStatus }
                            : call
                    )
                )
            }
        }

        setCurrentCall(null)
        setIsNegotiating(false)
    }, [simulateCall])

    const stopNegotiation = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
        setIsNegotiating(false)
        setCurrentCall(null)
    }, [])

    const resetNegotiation = useCallback(() => {
        setCalls([])
        setCurrentCall(null)
        setIsNegotiating(false)
    }, [])

    return {
        isNegotiating,
        calls,
        currentCall,
        startNegotiation,
        stopNegotiation,
        resetNegotiation
    }
}