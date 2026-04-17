import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { getCurrentRouteName, logAppError } from '@/lib/errorLogger';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logAppError(error, {
      source: 'error-boundary',
      route: getCurrentRouteName(),
      componentStack: info.componentStack ?? 'n/a',
      stack: error.stack,
    });
  }

  private reset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View className="flex-1 items-center justify-center px-6 bg-black">
        <Text className="text-white text-lg font-bold mb-3">Something went wrong</Text>
        <Text className="text-red-400 text-center text-xs mb-6">{this.state.message}</Text>
        <Text className="text-slate-400 text-xs mb-8">
          Route: {getCurrentRouteName()}
        </Text>
        <TouchableOpacity onPress={this.reset} className="bg-white px-5 py-3 rounded-lg">
          <Text className="text-black font-bold">Try Render Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

export default AppErrorBoundary;
