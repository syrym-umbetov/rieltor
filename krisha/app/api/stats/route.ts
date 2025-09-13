// app/api/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requestTracker } from '../../lib/request-tracker';

export async function GET() {
    const stats = await requestTracker.getStats();

    return NextResponse.json({
        stats,
        limits: {
            daily: 10000,
            hourly: 500,
            perSecond: 1
        },
        health: {
            status: 'healthy',
            uptime: process.uptime(),
            memory: process.memoryUsage()
        }
    });
}