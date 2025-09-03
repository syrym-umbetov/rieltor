'use client'

import { useState } from 'react'
import {
    Box,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Button,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Avatar,
    Menu,
    MenuItem,
    useTheme,
    useMediaQuery,
    BottomNavigation,
    BottomNavigationAction,
    Paper,
    Badge,
    Divider
} from '@mui/material'
import {
    Menu as MenuIcon,
    Home,
    Search,
    SmartToy,
    Star,
    Person,
    Notifications,
    Settings,
    Logout,
    Dashboard,
    Campaign,
    Analytics
} from '@mui/icons-material'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import Logo from '@/components/common/Logo'

interface MainLayoutProps {
    children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const router = useRouter()
    const pathname = usePathname()
    const { user, logout } = useAuth()

    const [mobileOpen, setMobileOpen] = useState(false)
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen)
    }

    const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleProfileMenuClose = () => {
        setAnchorEl(null)
    }

    const handleLogout = () => {
        logout()
        handleProfileMenuClose()
        router.push('/')
    }

    const navigationItems = [
        { title: 'Главная', icon: <Home />, path: '/' },
        { title: 'Поиск', icon: <Search />, path: '/properties' },
        { title: 'AI Чат', icon: <SmartToy />, path: '/chat' },
        { title: 'Услуги', icon: <Star />, path: '/services' },
        { title: 'Профиль', icon: <Person />, path: '/profile' }
    ]

    const drawer = (
        <Box sx={{ width: 250 }}>
            <Toolbar>
                <Logo />
            </Toolbar>
            <Divider />
            <List>
                {navigationItems.map((item) => (
                    <ListItem key={item.title} disablePadding>
                        <ListItemButton
                            selected={pathname === item.path}
                            onClick={() => {
                                router.push(item.path)
                                setMobileOpen(false)
                            }}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.title} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            {user && (
                <>
                    <Divider />
                    <List>
                        <ListItem disablePadding>
                            <ListItemButton onClick={() => router.push('/dashboard')}>
                                <ListItemIcon><Dashboard /></ListItemIcon>
                                <ListItemText primary="Мои объявления" />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton onClick={() => router.push('/targeting')}>
                                <ListItemIcon><Campaign /></ListItemIcon>
                                <ListItemText primary="AI Таргетинг" />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton onClick={() => router.push('/analytics')}>
                                <ListItemIcon><Analytics /></ListItemIcon>
                                <ListItemText primary="Аналитика" />
                            </ListItemButton>
                        </ListItem>
                    </List>
                </>
            )}
        </Box>
    )

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Top AppBar */}
            <AppBar position="sticky" elevation={0}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>

                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                        <Logo />
                    </Box>

                    {!isMobile && (
                        <Box sx={{ display: 'flex', gap: 2, mr: 3 }}>
                            {navigationItems.slice(0, 4).map((item) => (
                                <Button
                                    key={item.title}
                                    color="inherit"
                                    startIcon={item.icon}
                                    onClick={() => router.push(item.path)}
                                    sx={{
                                        color: pathname === item.path ? 'primary.light' : 'inherit'
                                    }}
                                >
                                    {item.title}
                                </Button>
                            ))}
                        </Box>
                    )}

                    <IconButton color="inherit" sx={{ mr: 1 }}>
                        <Badge badgeContent={3} color="error">
                            <Notifications />
                        </Badge>
                    </IconButton>

                    {user ? (
                        <>
                            <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0 }}>
                                <Avatar alt={user.full_name} src={user.avatar_url}>
                                    {user.full_name?.[0]}
                                </Avatar>
                            </IconButton>
                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleProfileMenuClose}
                            >
                                <MenuItem onClick={() => { router.push('/profile'); handleProfileMenuClose(); }}>
                                    <ListItemIcon><Person fontSize="small" /></ListItemIcon>
                                    Профиль
                                </MenuItem>
                                <MenuItem onClick={() => { router.push('/settings'); handleProfileMenuClose(); }}>
                                    <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
                                    Настройки
                                </MenuItem>
                                <Divider />
                                <MenuItem onClick={handleLogout}>
                                    <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
                                    Выйти
                                </MenuItem>
                            </Menu>
                        </>
                    ) : (
                        <Button
                            color="inherit"
                            variant="outlined"
                            onClick={() => router.push('/auth/login')}
                            sx={{ ml: 2 }}
                        >
                            Войти
                        </Button>
                    )}
                </Toolbar>
            </AppBar>

            {/* Side Drawer for Mobile */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 }
                }}
            >
                {drawer}
            </Drawer>

            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1, pb: isMobile ? 7 : 0 }}>
                {children}
            </Box>

            {/* Bottom Navigation for Mobile */}
            {isMobile && (
                <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }} elevation={3}>
                    <BottomNavigation
                        value={pathname}
                        onChange={(_, newValue) => router.push(newValue)}
                        showLabels
                    >
                        {navigationItems.map((item) => (
                            <BottomNavigationAction
                                key={item.path}
                                label={item.title}
                                value={item.path}
                                icon={item.path === '/chat' ? (
                                    <Badge variant="dot" color="error">
                                        {item.icon}
                                    </Badge>
                                ) : item.icon}
                            />
                        ))}
                    </BottomNavigation>
                </Paper>
            )}
        </Box>
    )
}