'use client'

import { useContext } from 'react'
import { NotificationContext } from '@/providers/NotificationProvider'

export function useNotification() {
    const context = useContext(NotificationContext)
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider')
    }
    return context
}