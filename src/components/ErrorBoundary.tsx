'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-900 text-white min-h-screen">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <div className="bg-red-800 p-4 rounded mb-4">
            <h2 className="text-lg font-semibold mb-2">Error Details:</h2>
            <pre className="text-sm overflow-auto">
              {this.state.error?.message}
            </pre>
          </div>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Try Again
          </button>
          <a 
            href="/debug" 
            className="ml-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded inline-block"
          >
            Go to Debug Page
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}
