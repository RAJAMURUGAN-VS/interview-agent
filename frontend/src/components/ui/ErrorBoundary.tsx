import { Component, type ReactNode } from 'react';

interface Props  { children: ReactNode; }
interface State  { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-[#8b8ba8] text-sm">
            Something went wrong. Please refresh the page.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
