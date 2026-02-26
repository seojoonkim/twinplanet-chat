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
          style={{ background: 'linear-gradient(135deg, #fdf2f8, #faf5ff)' }}>
          <img src="/logo.png" alt="tripleS chat" style={{ width: 52 }} />
          <h2 className="text-lg font-bold text-gray-700">앗, 오류가 발생했어요</h2>
          <p className="text-sm text-gray-400 max-w-xs">
            {this.state.error?.message ?? '알 수 없는 오류'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2 rounded-full text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
