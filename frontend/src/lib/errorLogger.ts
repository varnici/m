type ErrorContext = {
  source: string;
  route?: string;
  isFatal?: boolean;
  stack?: string;
  componentStack?: string;
  extra?: unknown;
};

let currentRoute = 'Unknown';
let globalHandlerInstalled = false;

const timestamp = () => new Date().toISOString();

export const setCurrentRouteName = (routeName: string) => {
  currentRoute = routeName;
};

export const getCurrentRouteName = () => currentRoute;

export const logAppError = (error: unknown, context: ErrorContext) => {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    `[AppError][${timestamp()}] source=${context.source} route=${context.route ?? currentRoute} fatal=${
      context.isFatal ?? false
    }\nmessage=${err.message}\nstack=${context.stack ?? err.stack ?? 'n/a'}\ncomponentStack=${
      context.componentStack ?? 'n/a'
    }\nextra=${JSON.stringify(context.extra ?? null)}`,
  );
};

export const installGlobalErrorHandler = () => {
  if (globalHandlerInstalled) return;
  globalHandlerInstalled = true;

  const errorUtils = (global as any)?.ErrorUtils;
  if (!errorUtils || typeof errorUtils.getGlobalHandler !== 'function') {
    console.warn('[AppError] Global ErrorUtils handler is unavailable');
    return;
  }

  const originalHandler = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler?.((error: unknown, isFatal?: boolean) => {
    logAppError(error, {
      source: 'global-handler',
      route: currentRoute,
      isFatal,
    });

    if (typeof originalHandler === 'function') {
      originalHandler(error, isFatal);
    }
  });
};
