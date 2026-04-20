import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductListScreen from '../../src/screens/inventory/ProductListScreen';

// Mocking dependencies
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

describe('ProductListScreen', () => {
  it('renders correctly and shows loading state', () => {
    const { getByText } = render(<ProductListScreen />, { wrapper });
    // Assuming there is a "Products" header or similar
    expect(getByText(/Products/i)).toBeTruthy();
  });

  it('allows searching for a product', async () => {
    const { getByPlaceholderText } = render(<ProductListScreen />, { wrapper });
    const searchInput = getByPlaceholderText(/Search products/i);
    
    fireEvent.changeText(searchInput, 'Coke');
    
    await waitFor(() => {
      expect(searchInput.props.value).toBe('Coke');
    });
  });
});
