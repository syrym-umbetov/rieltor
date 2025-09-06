'use client'

import { createContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

interface User {
    id: string
    email: string
    full_name: string
    avatar_url?: string
    phone?: string
    role: string
    subscription_tier: string
    created_at: string
    updated_at: string
}

interface AuthContextType {
    user: User | null
    loading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (data: RegisterData) => Promise<void>
    logout: () => Promise<void>
    updateProfile: (data: Partial<User>) => Promise<void>
}

interface RegisterData {
    email: string
    password: string
    full_name: string
    phone?: string
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('access_token')
            const savedUser = localStorage.getItem('user')

            if (token && savedUser) {
                // Сначала загружаем сохраненного пользователя для быстрого отображения
                try {
                    const userData = JSON.parse(savedUser)
                    setUser(userData)
                } catch (e) {
                    console.error('Error parsing saved user:', e)
                }

                // Затем проверяем токен на сервере
                const response = await fetch(`${API_URL}/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                })

                if (response.ok) {
                    const userData = await response.json()
                    setUser(userData)
                    localStorage.setItem('user', JSON.stringify(userData))
                } else if (response.status === 401) {
                    // Токен истек
                    localStorage.removeItem('access_token')
                    localStorage.removeItem('refresh_token')
                    localStorage.removeItem('user')
                    setUser(null)
                }
            }
        } catch (error) {
            console.error('Auth check error:', error)
        } finally {
            setLoading(false)
        }
    }

    const login = async (email: string, password: string) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        })

        if (!response.ok) {
            const errorText = await response.text()
            let errorMessage = 'Неверный email или пароль'
            try {
                const errorData = JSON.parse(errorText)
                errorMessage = errorData.detail || errorData.message || errorMessage
            } catch {
                errorMessage = errorText || errorMessage
            }
            throw new Error(errorMessage)
        }

        const data = await response.json()

        // Сохраняем токены и пользователя
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        localStorage.setItem('user', JSON.stringify(data.user))

        setUser(data.user)
        
        // Теперь делаем редирект после установки состояния
        router.push('/')
    }

    const register = async (data: RegisterData) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email: data.email,
                full_name: data.full_name,
                password: data.password,
                phone: data.phone || ''
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            let errorMessage = 'Ошибка регистрации'
            try {
                const errorData = JSON.parse(errorText)
                errorMessage = errorData.detail || errorData.message || errorMessage
            } catch {
                errorMessage = errorText || errorMessage
            }
            throw new Error(errorMessage)
        }

        // После успешной регистрации автоматически логинимся
        await login(data.email, data.password)
    }

    const logout = async () => {
        try {
            const token = localStorage.getItem('access_token')
            if (token) {
                // Отправляем запрос на сервер для логаута
                const response = await fetch(`${API_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                })
                
                // Логируем результат, но не блокируем logout при ошибке сервера
                if (response.ok) {
                    console.log('Logout successful on server')
                } else {
                    console.warn('Server logout failed, but continuing with local logout')
                }
            }
        } catch (error) {
            console.error('Logout error:', error)
            // Продолжаем локальный logout даже при ошибке сервера
        } finally {
            // Всегда очищаем локальные данные
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
            setUser(null)
            router.push('/')
        }
    }

    const updateProfile = async (data: Partial<User>) => {
        const token = localStorage.getItem('access_token')
        if (!token) throw new Error('Не авторизован')

        const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        })

        if (!response.ok) {
            throw new Error('Ошибка обновления профиля')
        }

        const updatedUser = await response.json()
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    )
}