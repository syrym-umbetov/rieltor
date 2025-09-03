'use client'

import { createContext, useState, useCallback, ReactNode } from 'react'
import { Snackbar, Alert, AlertColor } from '@mui/material'

interface Notification {
    id: string
    message: string
    severity: AlertColor
    duration?: number
}

interface NotificationContextType {
    showNotification: (message: string, severity?: AlertColor, duration?: number) => void
    notifications: Notification[]
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([])

    const showNotification = useCallback((
        message: string,
        severity: AlertColor = 'info',
        duration: number = 5000
    ) => {
        const id = Date.now().toString()
        const notification: Notification = { id, message, severity, duration }

        setNotifications(prev => [...prev, notification])

        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id))
        }, duration)
    }, [])

    const handleClose = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    return (
        <NotificationContext.Provider value={{ showNotification, notifications }}>
            {children}
            {notifications.map((notification) => (
                <Snackbar
                    key={notification.id}
                    open={true}
                    autoHideDuration={notification.duration}
                    onClose={() => handleClose(notification.id)}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <Alert
                        onClose={() => handleClose(notification.id)}
                        severity={notification.severity}
                        sx={{ width: '100%' }}
                    >
                        {notification.message}
                    </Alert>
                </Snackbar>
            ))}
        </NotificationContext.Provider>
    )
}