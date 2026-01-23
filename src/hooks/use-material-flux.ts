'use client';

import { useCallback, useEffect, useRef } from 'react';

interface MaterialFluxOptions {
    /** Enable the flux border effect */
    enableFluxBorder?: boolean;
    /** CSS variable prefix for mouse coordinates */
    varPrefix?: string;
}

/**
 * Material Flux Hook - Interactive Mouse-Tracking Refraction Effect
 * 
 * Creates a dynamic radial gradient border that follows the mouse cursor,
 * simulating light refraction through glass surfaces.
 * 
 * @example
 * ```tsx
 * const fluxRef = useMaterialFlux<HTMLDivElement>();
 * return <div ref={fluxRef} className="flux-border">Content</div>;
 * ```
 */
export function useMaterialFlux<T extends HTMLElement>(
    options: MaterialFluxOptions = {}
) {
    const { enableFluxBorder = true, varPrefix = '' } = options;
    const ref = useRef<T>(null);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        ref.current.style.setProperty(`--${varPrefix}mouse-x`, `${x}%`);
        ref.current.style.setProperty(`--${varPrefix}mouse-y`, `${y}%`);
    }, [varPrefix]);

    const handleMouseLeave = useCallback(() => {
        if (!ref.current) return;
        // Reset to center on mouse leave
        ref.current.style.setProperty(`--${varPrefix}mouse-x`, '50%');
        ref.current.style.setProperty(`--${varPrefix}mouse-y`, '50%');
    }, [varPrefix]);

    useEffect(() => {
        const element = ref.current;
        if (!element || !enableFluxBorder) return;

        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            element.removeEventListener('mousemove', handleMouseMove);
            element.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [handleMouseMove, handleMouseLeave, enableFluxBorder]);

    return ref;
}
