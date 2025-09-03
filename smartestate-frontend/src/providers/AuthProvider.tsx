'use client'

import { createContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface User {
    id: string
    email: string
    full_name: string
    avatar_url?: string
    phone?: string
    role: string
    subscription_tier: string
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
            if (!token) {
                setLoading(false)
                return
            }

            const response = await axios.get('/api/auth/profile', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setUser(response.data)
        } catch (error) {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
        } finally {
            setLoading(false)
        }
    }

    const login = async (email: string, password: string) => {
        try {
            const response = await axios.post('/api/auth/login', { email, password })
            const { access_token, refresh_token, user } = response.data

            localStorage.setItem('access_token', access_token)
            localStorage.setItem('refresh_token', refresh_token)

            setUser(user)
            router.push('/dashboard')
        } catch (error) {
            throw new Error('Неверный email или пароль')
        }
    }

    const register = async (data: RegisterData) => {
        try {
            const response = await axios.post('/api/auth/register', data)
            const { access_token, refresh_token, user } = response.data

            localStorage.setItem('access_token', access_token)
            localStorage.setItem('refresh_token', refresh_token)

            setUser(user)
            router.push('/dashboard')
        } catch (error) {
            throw new Error('Ошибка регистрации')
        }
    }

    const logout = async () => {
        try {
            const token = localStorage.getItem('access_token')
            if (token) {
                await axios.post('/api/auth/logout', {}, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            }
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            setUser(null)
            router.push('/')
        }
    }

    const updateProfile = async (data: Partial<User>) => {
        try {
            const token = localStorage.getItem('access_token')
            const response = await axios.put('/api/auth/profile', data, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setUser(response.data)
        } catch (error) {
            throw new Error('Ошибка обновления профиля')
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
)
}