# Performance Audit Checklist

- Hermes engine enabled for React Native production builds
- Use FlatList for large lists (see InventoryList)
- Minimize re-renders with React.memo and useCallback where needed
- Use lazy loading for screens/components
- Avoid unnecessary network requests (debounce, cache where possible)
- Use production API endpoints and CDN for static assets
- Monitor app size and bundle splitting
- Profile with Flipper and React Native DevTools
