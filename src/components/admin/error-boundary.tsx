'use client';

import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class AnalyticsErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Analytics Dashboard Error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);

        // Potential integration with monitoring services
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'exception', {
                description: error.message,
                fatal: false
            });
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-8 text-center flex flex-col items-center justify-center liquid-glass rounded-2xl border border-red-500/20 bg-red-500/5">
                    <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-red-500/10 ring-8 ring-red-500/5">
                        <svg
                            className="w-8 h-8 text-red-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                        Dashboard Error
                    </h3>
                    <p className="text-white/40 mb-6 max-w-sm">
                        {this.state.error?.message || 'An unexpected error occurred while rendering the analytics dashboard.'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-6 py-2.5 bg-[#00FF85] text-black font-bold rounded-xl hover:bg-[#00FF85]/90 transition-all active:scale-95 shadow-lg shadow-[#00FF85]/20"
                    >
                        Refresh Interface
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
