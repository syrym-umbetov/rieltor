import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '@/styles/theme'
import { AuthProvider } from '@/providers/AuthProvider'
import { NotificationProvider } from '@/providers/NotificationProvider'
import { ChatProvider } from '@/providers/ChatProvider'
import MainLayout from '@/components/layout/MainLayout'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
    title: 'SmartEstate KZ - AI Риелтор',
    description: 'Найдем идеальную недвижимость за 3 минуты с помощью AI',
    keywords: 'недвижимость, квартиры, аренда, продажа, AI, Казахстан, Алматы',
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="ru">
        <body className={inter.className}>
        <AppRouterCacheProvider>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <AuthProvider>
                    <NotificationProvider>
                        <ChatProvider>
                            <MainLayout>
                                {children}
                            </MainLayout>
                        </ChatProvider>
                    </NotificationProvider>
                </AuthProvider>
            </ThemeProvider>
        </AppRouterCacheProvider>
        </body>
        </html>
    )
}
