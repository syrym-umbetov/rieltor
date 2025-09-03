import {NextRequest, NextResponse} from "next/server";

export function middleware(request: NextRequest) {

    const token = request.cookies.get('token')
    if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
    }
}