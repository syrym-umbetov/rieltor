// app/api/stats/limits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requestTracker } from '../../lib/request-tracker';
export async function GET() {
    const limits = await requestTracker.getRateLimits();
    return NextResponse.json(limits);
}

export async function POST(request: NextRequest) {
    const body = await request.json();

    // Валидация
    if (body.dailyLimit && body.dailyLimit > 50000) {
        return NextResponse.json(
            { error: 'Дневной лимит не может превышать 50000' },
            { status: 400 }
        );
    }

    await requestTracker.setRateLimits(body);

    return NextResponse.json({
        success: true,
        limits: await requestTracker.getRateLimits()
    });
}