'use client'

import { Box, Typography } from '@mui/material'
import { Home } from '@mui/icons-material'
import Link from 'next/link'

export default function Logo() {
    return (
        <Link href="/" style={{ textDecoration: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Home sx={{ color: 'primary.main', fontSize: 28 }} />
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 700,
                        background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}
                >
                    SmartEstate
                </Typography>
            </Box>
        </Link>
    )
}