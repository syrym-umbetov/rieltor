'use client'

import { useState } from 'react'
import {
    Container,
    Grid,
    Paper,
    Typography,
    Box,
    List,
    ListItem,
    ListItemButton,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Divider,
    Chip,
    IconButton,
    TextField,
    InputAdornment
} from '@mui/material'
import {
    SmartToy,
    Search,
    Add,
    Delete,
    MoreVert
} from '@mui/icons-material'
import AIChat from '@/components/chat/AIChat'
import { useChat } from '@/hooks/useChat'
import { format } from 'date-fns'

export default function ChatPage() {
    const { sessions, currentSession, createSession, loadSession } = useChat()
    const [searchQuery, setSearchQuery] = useState('')

    const filteredSessions = sessions.filter(session =>
        session.messages.some(msg =>
            msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
    )

    return (
        <Container maxWidth="xl" sx={{ py: 4, height: 'calc(100vh - 100px)' }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                AI Чат-помощник
            </Typography>

            <Grid container spacing={3} sx={{ height: 'calc(100% - 50px)' }}>
                {/* Sessions List */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2 }}>
                            <TextField
                                fullWidth
                                placeholder="Поиск в чатах..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search />
                                        </InputAdornment>
                                    )
                                }}
                                size="small"
                            />
                        </Box>

                        <Divider />

                        <Box sx={{ p: 2 }}>
                            <IconButton
                                color="primary"
                                onClick={createSession}
                                sx={{
                                    width: '100%',
                                    borderRadius: 2,
                                    border: 1,
                                    borderColor: 'primary.main'
                                }}
                            >
                                <Add sx={{ mr: 1 }} />
                                Новый чат
                            </IconButton>
                        </Box>

                        <List sx={{ flex: 1, overflow: 'auto' }}>
                            {filteredSessions.map((session) => (
                                <ListItem
                                    key={session.id}
                                    secondaryAction={
                                        <IconButton edge="end">
                                            <MoreVert />
                                        </IconButton>
                                    }
                                    disablePadding
                                >
                                    <ListItemButton
                                        selected={currentSession?.id === session.id}
                                        onClick={() => loadSession(session.id)}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                                                <SmartToy />
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                session.messages[0]?.content.substring(0, 50) + '...' || 'Новый чат'
                                            }
                                            secondary={format(new Date(session.messages[0]?.timestamp || new Date()), 'dd.MM.yyyy HH:mm')}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>

                {/* Main Chat */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ height: '100%' }}>
                        <AIChat />
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    )
}