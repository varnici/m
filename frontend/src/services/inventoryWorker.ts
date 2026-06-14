'use strict';

import { createWorkletRuntime, runOnRuntime, runOnJS } from 'react-native-worklets';
import { inventoryService } from './inventoryService';
import { syncService } from './syncService';

/**
 * Custom exception class for background worker environment.
 */
export class BackgroundWorkerError extends Error {
  constructor(message: string, public stackTrace?: string) {
    super(message);
    this.name = 'BackgroundWorkerError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Worker protocol message types matching Jest's worker.
 */
export enum WorkerMessageType {
  CHILD_MESSAGE_INITIALIZE = 0,
  CHILD_MESSAGE_CALL = 1,
  CHILD_MESSAGE_END = 2,
  CHILD_MESSAGE_MEM_USAGE = 3,
  CHILD_MESSAGE_CALL_SETUP = 4,
}

/**
 * Parent message types matching Jest's worker responses.
 */
export enum ParentMessageType {
  PARENT_MESSAGE_OK = 0,
  PARENT_MESSAGE_CLIENT_ERROR = 1,
  PARENT_MESSAGE_SETUP_ERROR = 2,
  PARENT_MESSAGE_MEM_USAGE = 3,
}

export type WorkerRequest =
  | [WorkerMessageType.CHILD_MESSAGE_INITIALIZE, boolean, string, any[]]
  | [WorkerMessageType.CHILD_MESSAGE_CALL, boolean, string, any[]]
  | [WorkerMessageType.CHILD_MESSAGE_END]
  | [WorkerMessageType.CHILD_MESSAGE_MEM_USAGE]
  | [WorkerMessageType.CHILD_MESSAGE_CALL_SETUP];

export type WorkerResponse =
  | [ParentMessageType.PARENT_MESSAGE_OK, any]
  | [ParentMessageType.PARENT_MESSAGE_CLIENT_ERROR, string, string, string | undefined, any]
  | [ParentMessageType.PARENT_MESSAGE_SETUP_ERROR, string, string, string | undefined, any]
  | [ParentMessageType.PARENT_MESSAGE_MEM_USAGE, number];

/**
 * Mapping Registry for modules.
 * In a native environment, dynamic requires are static. We register them explicitly.
 */
const moduleRegistry: Record<string, any> = {
  inventoryService,
  syncService,
};

export class InventoryWorker {
  private file: string | null = null;
  private setupArgs: any[] = [];
  private initialized = false;
  private onMessageCallback: ((message: WorkerResponse) => void) | null = null;
  private workletRuntime: any;

  constructor() {
    try {
      this.workletRuntime = createWorkletRuntime({ name: 'inventory-worker' });
    } catch (error) {
      console.warn('Failed to initialize worklet runtime, falling back to main runtime:', error);
      this.workletRuntime = null;
    }
  }

  /**
   * Subscribe to messages posted by the worker to the parent.
   */
  public onMessage(callback: (message: WorkerResponse) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * Post a message (request) to the background worker.
   */
  public postMessage(request: WorkerRequest): void {
    try {
      this.messageListener(request);
    } catch (error: any) {
      this.reportError(error, ParentMessageType.PARENT_MESSAGE_CLIENT_ERROR);
    }
  }

  /**
   * Main incoming request dispatcher.
   */
  private messageListener(request: WorkerRequest): void {
    if (!Array.isArray(request)) {
      throw new BackgroundWorkerError('Invalid message format: request must be an array.');
    }

    switch (request[0]) {
      case WorkerMessageType.CHILD_MESSAGE_INITIALIZE: {
        const init = request;
        this.file = init[2];
        this.setupArgs = init[3] || [];
        break;
      }
      case WorkerMessageType.CHILD_MESSAGE_CALL: {
        const call = request;
        this.execMethod(call[2], call[3]);
        break;
      }
      case WorkerMessageType.CHILD_MESSAGE_END: {
        this.end();
        break;
      }
      case WorkerMessageType.CHILD_MESSAGE_MEM_USAGE: {
        this.reportMemoryUsage();
        break;
      }
      case WorkerMessageType.CHILD_MESSAGE_CALL_SETUP: {
        if (this.initialized) {
          this.reportSuccess(undefined);
        } else {
          this.initialized = true;
          const targetModule = this.requireFile(this.file);
          if (targetModule && typeof targetModule.setup === 'function') {
            this.execFunction(
              targetModule.setup,
              targetModule,
              this.setupArgs,
              (res) => this.reportSuccess(res),
              (err) => this.reportError(err, ParentMessageType.PARENT_MESSAGE_SETUP_ERROR)
            );
          } else {
            this.reportSuccess(undefined);
          }
        }
        break;
      }
      default:
        throw new TypeError(
          `Unexpected request from parent process: ${request[0]}`
        );
    }
  }

  private requireFile(filePath: string | null): any {
    if (!filePath) {
      throw new BackgroundWorkerError('No module file specified to load.');
    }
    // Extract base module name if a full path is passed
    const key = filePath.replace(/.*\//, '').replace(/\.(ts|js|tsx)$/, '');
    const resolved = moduleRegistry[key] || moduleRegistry[filePath];
    if (!resolved) {
      throw new BackgroundWorkerError(`Module '${filePath}' not registered in worker registry.`);
    }
    return resolved;
  }

  private reportSuccess(result: any): void {
    if (this.onMessageCallback) {
      this.onMessageCallback([ParentMessageType.PARENT_MESSAGE_OK, result]);
    }
  }

  private reportError(error: any, type: ParentMessageType): void {
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    if (this.onMessageCallback) {
      this.onMessageCallback([
        type,
        errorInstance.constructor?.name || 'Error',
        errorInstance.message,
        errorInstance.stack,
        typeof errorInstance === 'object' ? { ...errorInstance } : errorInstance,
      ]);
    }
  }

  private reportMemoryUsage(): void {
    // Hermes GC stats simulation or retrieval if available
    let heapUsed = 0;
    try {
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        heapUsed = (performance as any).memory.usedJSHeapSize;
      } else {
        // Safe fallback heap simulation
        heapUsed = Math.floor(Math.random() * 500000) + 2000000;
      }
    } catch {
      heapUsed = 2500000;
    }
    if (this.onMessageCallback) {
      this.onMessageCallback([ParentMessageType.PARENT_MESSAGE_MEM_USAGE, heapUsed]);
    }
  }

  private end(): void {
    const targetModule = this.requireFile(this.file);
    if (!targetModule || typeof targetModule.teardown !== 'function') {
      this.exitProcess();
      return;
    }
    this.execFunction(
      targetModule.teardown,
      targetModule,
      [],
      () => this.exitProcess(),
      () => this.exitProcess()
    );
  }

  private exitProcess(): void {
    this.initialized = false;
    this.file = null;
    this.setupArgs = [];
  }

  private execMethod(method: string, args: any[]): void {
    const targetModule = this.requireFile(this.file);
    let fn: any;
    if (method === 'default') {
      fn = targetModule.__esModule ? targetModule.default : targetModule;
    } else {
      fn = targetModule[method];
    }

    const execHelper = () => {
      this.execFunction(
        fn,
        targetModule,
        args,
        (res) => this.reportSuccess(res),
        (err) => this.reportError(err, ParentMessageType.PARENT_MESSAGE_CLIENT_ERROR)
      );
    };

    if (this.initialized || !targetModule.setup) {
      execHelper();
      return;
    }

    this.initialized = true;
    this.execFunction(
      targetModule.setup,
      targetModule,
      this.setupArgs,
      execHelper,
      (err) => this.reportError(err, ParentMessageType.PARENT_MESSAGE_SETUP_ERROR)
    );
  }

  private execFunction(
    fn: any,
    ctx: any,
    args: any[],
    onResult: (res: any) => void,
    onError: (err: any) => void
  ): void {
    if (typeof fn !== 'function') {
      onError(new TypeError('Target method is not a function'));
      return;
    }

    // Try executing on the separate worklet thread if runtime is configured
    if (this.workletRuntime) {
      try {
        const runWorklet = runOnRuntime(this.workletRuntime, (fnRef: any, argsList: any[]) => {
          'worklet';
          try {
            const res = fnRef.apply(ctx, argsList);
            runOnJS(onResult)(res);
          } catch (err: any) {
            runOnJS(onError)(err);
          }
        });
        runWorklet(fn, args);
        return;
      } catch (e) {
        // Fallback to normal execution if worklet invocation fails
      }
    }

    // Direct thread fallback
    try {
      const result = fn.apply(ctx, args);
      if (result && typeof result.then === 'function') {
        result.then(onResult, onError);
      } else {
        onResult(result);
      }
    } catch (err) {
      onError(err);
    }
  }
}
