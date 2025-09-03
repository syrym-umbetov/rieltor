'use client'

import { createContext, useState, useCallback, ReactNode } from 'react'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'

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
    const [socket, setSocket] = useState<Socket | null>(null)

    const initSocket = useCallback(() => {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080', {
            auth: { token },
            transports: ['websocket']
        })

        newSocket.on('message', (message: Message) => {
            setCurrentSession(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    messages: [...prev.messages, message]
                }
            })
            setIsTyping(false)
        })

        newSocket.on('typing', () => {
            setIsTyping(true)
        })

        setSocket(newSocket)

        return () => {
            newSocket.close()
        }
    }, [])

    const createSession = async () => {
        try {
            const token = localStorage.getItem('access_token')
            const response = await axios.post('/api/chat/sessions', {}, {
                headers: { Authorization: `Bearer ${token}` }
            })

            const session = response.data
            setCurrentSession(session)
            setSessions(prev => [...prev, session])

            if (!socket) {
                initSocket()
            }
        } catch (error) {
            throw new Error('Ошибка создания сессии')
        }
    }

    const loadSession = async (sessionId: string) => {
        try {
            const token = localStorage.getItem('access_token')
            const response = await axios.get(`/api/chat/sessions/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            setCurrentSession(response.data)

            if (!socket) {
                initSocket()
            }
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
                messages: [...prev.messages, message]
            }
        })

        try {
            const token = localStorage.getItem('access_token')

            if (socket && socket.connected) {
                socket.emit('message', {
                    session_id: currentSession?.id,
                    content
                })
            } else {
                const response = await axios.post('/api/chat/messages', {
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
                        messages: [...prev.messages, aiMessage]
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