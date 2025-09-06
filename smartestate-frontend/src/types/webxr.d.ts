// TypeScript definitions for WebXR API
declare global {
    interface Navigator {
        xr?: XRSystem
    }

    interface XRSystem {
        isSessionSupported(sessionMode: XRSessionMode): Promise<boolean>
        requestSession(sessionMode: XRSessionMode, sessionInit?: XRSessionInit): Promise<XRSession>
    }

    type XRSessionMode = 'immersive-vr' | 'immersive-ar' | 'inline'

    interface XRSessionInit {
        requiredFeatures?: string[]
        optionalFeatures?: string[]
    }

    interface XRSession extends EventTarget {
        end(): Promise<void>
        requestReferenceSpace(type: XRReferenceSpaceType): Promise<XRReferenceSpace>
        requestAnimationFrame(callback: XRFrameRequestCallback): number
        cancelAnimationFrame(id: number): void
    }

    type XRReferenceSpaceType = 'viewer' | 'local' | 'local-floor' | 'bounded-floor' | 'unbounded'

    interface XRReferenceSpace extends EventTarget {
        getOffsetReferenceSpace?(originOffset: XRRigidTransform): XRReferenceSpace
    }

    interface XRRigidTransform {
        position: DOMPointReadOnly
        orientation: DOMPointReadOnly
        matrix: Float32Array
        inverse: XRRigidTransform
    }

    type XRFrameRequestCallback = (time: DOMHighResTimeStamp, frame: XRFrame) => void

    interface XRFrame {
        session: XRSession
        // Frame methods and properties
    }

    // Extend CanvasRenderingContext2D with roundRect if not supported
    interface CanvasRenderingContext2D {
        roundRect?(x: number, y: number, w: number, h: number, r: number): this
    }
}

export {}