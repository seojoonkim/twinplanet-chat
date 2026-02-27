import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 px-6 text-center"
          style={{ background: 'linear-gradient(135deg, #f0ff80, #dcff00)' }}>
          <div style={{ width: 52, height: 52, background: '#3e3a39', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#dcff00', letterSpacing: '-0.5px' }}>TP</div>
          <h2 className="text-lg font-bold" style={{ color: '#3e3a39' }}>エラーが発生しました</h2>
          <p className="text-sm max-w-xs" style={{ color: '#5a5654' }}>
            {this.state.error?.message ?? 'Unknown error'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2 rounded-full text-sm font-bold"
            style={{ background: '#3e3a39', color: '#dcff00' }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
