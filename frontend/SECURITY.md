# Security Best Practices for Inventory App

- All API calls use HTTPS only (never HTTP in production)
- No secrets or API keys in the frontend codebase
- Validate and sanitize all user input on both frontend and backend
- Use React Native secure storage for any tokens (if needed)
- No use of `eval` or dynamic code execution
- Backend enforces CORS, rate limiting, and security headers
- Production build uses Hermes and disables debug features
- Regularly audit dependencies for vulnerabilities
