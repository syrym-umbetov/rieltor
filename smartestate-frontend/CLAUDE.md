# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` - Start Next.js development server on http://localhost:3000
- **Build**: `npm run build` - Build production version
- **Production server**: `npm start` - Start production server
- **Linting**: `npm run lint` - Run ESLint with Next.js configuration

## Project Architecture

### Tech Stack
- **Framework**: Next.js 14.1.0 with App Router
- **Language**: TypeScript with strict mode enabled
- **UI Library**: Material-UI (MUI) v5 with custom theme
- **Styling**: Emotion (CSS-in-JS) + MUI theme system
- **State Management**: Zustand for global state, React Context for auth/providers
- **Data Fetching**: TanStack React Query v5 for server state
- **Forms**: React Hook Form with Yup validation
- **Real-time**: Socket.io client
- **Animations**: Framer Motion

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages (login, register)
│   ├── chat/              # AI chat interface
│   ├── profile/           # User profile pages
│   ├── properties/        # Property listing pages
│   ├── services/          # Services pages
│   ├── vr-tours/          # VR tours with WebXR support
│   └── layout.tsx         # Root layout with providers
├── components/            # Reusable UI components
│   ├── auth/             # Authentication components
│   ├── chat/             # Chat-related components
│   ├── common/           # Common/shared components
│   ├── home/             # Homepage components
│   ├── layout/           # Layout components (MainLayout)
│   ├── property/         # Property-related components
│   └── vr/               # VR components (VRPlayer)
├── hooks/                # Custom React hooks
│   ├── useAuth.tsx       # Authentication hook
│   └── useProperty.tsx   # Property management hook
├── lib/                  # Utility libraries and configurations
├── providers/            # React context providers
│   ├── AuthProvider.tsx  # Authentication context
│   ├── ChatProvider.tsx  # Chat state management
│   └── NotificationProvider.tsx # Notifications
├── styles/               # Theme and styling
│   └── theme.ts          # MUI theme configuration
├── types/                # TypeScript type definitions
│   └── webxr.d.ts        # WebXR API types
└── middleware.ts         # Next.js middleware
```

### Key Architecture Patterns

#### Authentication & Authorization
- **Context Pattern**: `AuthProvider` manages user state globally
- **Hook Pattern**: `useAuth()` hook for accessing auth context
- **Middleware**: Route protection via Next.js middleware
- **Token Management**: JWT tokens stored in localStorage with automatic refresh
- **API Integration**: REST API calls to backend at `http://localhost:8080/api`

#### Component Architecture
- **Provider Hierarchy**: AuthProvider → NotificationProvider → ChatProvider → MainLayout
- **Layout System**: Single `MainLayout` component wraps all pages
- **Page Structure**: App Router with nested layouts for different sections
- **Material-UI Integration**: Custom theme with consistent design system

#### State Management Strategy
- **Global Auth State**: React Context via AuthProvider
- **Component State**: React useState for local component state
- **Server State**: TanStack React Query for API data caching
- **Real-time State**: Socket.io integration via ChatProvider

#### Styling Approach
- **Theme System**: Custom MUI theme with indigo primary (#6366f1) and green secondary (#10b981)
- **Component Styling**: MUI's sx prop and styled components via Emotion
- **Typography**: Custom font stack with Inter font and system fallbacks
- **Design Tokens**: Consistent border radius (12px), shadows, and spacing

#### VR Tours & WebXR Integration
- **WebXR Support**: Modern VR/AR browser API for immersive experiences
- **360° Panorama Viewer**: Canvas-based panoramic image rendering with mouse/touch controls
- **Interactive Hotspots**: Clickable navigation and information points in VR space
- **VR Device Support**: Full WebXR integration for VR headsets (Quest, Pico, etc.)
- **Fallback Experience**: Graceful degradation for browsers without WebXR support
- **Performance Optimized**: Canvas rendering with requestAnimationFrame for smooth 60fps
- **Touch Controls**: Multi-touch support for mobile VR viewing

### Environment Configuration
- **API URL**: Configurable via `NEXT_PUBLIC_API_URL` (defaults to localhost:8080)
- **Language**: Russian locale configured as primary language
- **Font Loading**: Inter font with Latin and Cyrillic subsets

### Import Aliases
- `@/*` maps to `./src/*` for clean imports

### Development Notes
- Uses strict TypeScript configuration with ES2017 target
- ESLint configured with Next.js and TypeScript rules
- Material-UI integrated with Next.js App Router via AppRouterCacheProvider
- CssBaseline applied for consistent cross-browser styling