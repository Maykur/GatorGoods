import { Component } from 'react';
import { Button, Card } from './ui';

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('GatorGoods UI error boundary caught an error.', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({hasError: false});
  };

  handleReload = () => {
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
          <Card padding="lg" className="w-full max-w-xl space-y-6 text-left">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
                App recovery mode
              </p>
              <h1 className="text-3xl font-semibold text-white">
                Something broke in the interface
              </h1>
              <p className="text-sm leading-7 text-app-soft">
                GatorGoods hit a runtime error. You can try reloading this view or jump back to
                the landing page while we recover.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" onClick={this.handleRetry}>
                Try again
              </Button>
              <Button onClick={this.handleReload}>Go to landing page</Button>
            </div>
          </Card>
        </main>
      );
    }

    return this.props.children;
  }
}
