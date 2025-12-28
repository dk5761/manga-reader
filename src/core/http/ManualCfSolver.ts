type EventCallback = (data?: any) => void;

/**
 * Global coordinator for manual Cloudflare bypass.
 * Manages showing/hiding CloudflareBypassModal and handling results.
 *
 * Used by CloudflareInterceptor when automatic CF solving fails.
 */
class ManualCfSolverClass {
  private activeRequest: {
    url: string;
    resolve: (cookies: string) => void;
    reject: (error: Error) => void;
  } | null = null;

  private listeners: Map<string, EventCallback[]> = new Map();

  /**
   * Add event listener
   */
  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: EventCallback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  /**
   * Request manual CF bypass from user
   * Shows modal and returns promise that resolves with cookies or rejects if cancelled
   */
  requestManualSolve(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.activeRequest = {
        url,
        resolve,
        reject,
      };

      // Emit event to show modal
      console.log("[ManualCfSolver] Requesting manual solve for:", url);
      this.emit("show", { url });
    });
  }

  /**
   * Called by modal when user successfully solves CF challenge
   */
  handleSuccess(cookies: string) {
    if (this.activeRequest) {
      console.log("[ManualCfSolver] User successfully solved CF challenge");
      this.activeRequest.resolve(cookies);
      this.activeRequest = null;
      this.emit("hide");
    }
  }

  /**
   * Called by modal when user cancels
   */
  handleCancel() {
    if (this.activeRequest) {
      console.log("[ManualCfSolver] User cancelled CF bypass");
      this.activeRequest.reject(new Error("User cancelled manual CF bypass"));
      this.activeRequest = null;
      this.emit("hide");
    }
  }

  /**
   * Get current URL being solved (for modal)
   */
  getCurrentUrl(): string | null {
    return this.activeRequest?.url || null;
  }
}

export const ManualCfSolver = new ManualCfSolverClass();
