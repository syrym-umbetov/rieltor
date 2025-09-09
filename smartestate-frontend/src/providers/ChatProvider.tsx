'use client'

import { createContext, useState, useCallback, ReactNode, useRef } from 'react'
import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    metadata?: any
    timestamp: Date
}

interface ChatSession {
    id: string
    messages: Message[]
    context: any
}

interface ChatContextType {
    currentSession: ChatSession | null
    sessions: ChatSession[]
    sendMessage: (content: string) => Promise<void>
    createSession: () => Promise<void>
    loadSession: (sessionId: string) => Promise<void>
    clearSession: () => void
    isTyping: boolean
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
    const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [isTyping, setIsTyping] = useState(false)
    const wsRef = useRef<WebSocket | null>(null)

    const initWebSocket = useCallback(() => {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const wsUrl = `ws://localhost:8080/api/ws/chat?token=${token}`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
            console.log('WebSocket connected')
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                
                if (data.type === 'response') {
                    const message: Message = {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: data.content,
                        timestamp: new Date()
                    }
                    
                    setCurrentSession(prev => {
                        if (!prev) return null
                        return {
                            ...prev,
                            messages: [...(prev.messages || []), message]
                        }
                    })
                    setIsTyping(false)
                } else if (data.type === 'typing') {
                    setIsTyping(true)
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error)
            }
        }

        ws.onclose = () => {
            console.log('WebSocket disconnected')
        }

        ws.onerror = (error) => {
            console.error('WebSocket error:', error)
        }

        wsRef.current = ws

        return () => {
            ws.close()
        }
    }, [])

    const createSession = async () => {
        try {
            const token = localStorage.getItem('access_token')
            const response = await axios.post(`${API_BASE_URL}/chat/sessions`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })

            const session = { 
                ...response.data, 
                messages: response.data.messages || [] 
            }
            setCurrentSession(session)
            setSessions(prev => [...prev, session])

            // Temporarily disable WebSocket - use HTTP fallback only
            // if (!wsRef.current) {
            //     initWebSocket()
            // }
        } catch (error) {
            throw new Error('Ошибка создания сессии')
        }
    }

    const loadSession = async (sessionId: string) => {
        try {
            const token = localStorage.getItem('access_token')
            const response = await axios.get(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            const session = { 
                ...response.data, 
                messages: response.data.messages || [] 
            }
            setCurrentSession(session)

            // Temporarily disable WebSocket - use HTTP fallback only
            // if (!wsRef.current) {
            //     initWebSocket()
            // }
        } catch (error) {
            throw new Error('Ошибка загрузки сессии')
        }
    }

    const sendMessage = async (content: string) => {
        if (!currentSession) {
            await createSession()
        }

        const message: Message = {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: new Date()
        }

        setCurrentSession(prev => {
            if (!prev) return null
            return {
                ...prev,
                messages: [...(prev.messages || []), message]
            }
        })

        try {
            const token = localStorage.getItem('access_token')

            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                // Send via WebSocket
                wsRef.current.send(JSON.stringify({
                    type: 'message',
                    session_id: currentSession?.id,
                    content
                }))
                setIsTyping(true)
            } else {
                // Fallback to HTTP
                const response = await axios.post(`${API_BASE_URL}/chat/messages`, {
                    session_id: currentSession?.id,
                    content
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                const aiMessage = response.data
                setCurrentSession(prev => {
                    if (!prev) return null
                    return {
                        ...prev,
                        messages: [...(prev.messages || []), aiMessage]
                    }
                })
            }
        } catch (error) {
            throw new Error('Ошибка отправки сообщения')
        }
    }

    const clearSession = () => {
        setCurrentSession(null)
    }

    return (
        <ChatContext.Provider value={{
            currentSession,
            sessions,
            sendMessage,
            createSession,
            loadSession,
            clearSession,
            isTyping
        }}>
            {children}
        </ChatContext.Provider>
    )
}