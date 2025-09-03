'use client'

import { Grid, Paper, Typography, Box } from '@mui/material'
import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import { Home, Percent, AccessTime } from '@mui/icons-material'

const stats = [
    {
        value: 500000,
        label: 'объектов',
        icon: <Home />,
        suffix: '+'
    },
    {
        value: 95,
        label: 'точность',
        icon: <Percent />,
        suffix: '%'
    },
    {
        value: 24,
        label: 'поддержка',
        icon: <AccessTime />,
        suffix: '/7'
    }
]

export default function StatsSection() {
    return (
        <Grid container spacing={3}>
            {stats.map((stat, index) => (
                <Grid item xs={12} sm={4} key={index}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                        <Paper
                            elevation={3}
                            sx={{
                                p: 3,
                                textAlign: 'center',
                                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                                borderRadius: 3
                            }}
                        >
                            <Box sx={{ color: 'primary.main', mb: 1 }}>
                                {stat.icon}
                            </Box>
                            <Typography variant="h3" fontWeight="bold" color="primary">
                                <CountUp end={stat.value} duration={2} separator="," />
                                {stat.suffix}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {stat.label}
                            </Typography>
                        </Paper>
                    </motion.div>
                </Grid>
            ))}
        </Grid>
    )
}