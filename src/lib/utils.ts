import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * 
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns A debounced version of the original function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  
  return function(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = window.setTimeout(later, wait);
  };
}

/**
 * Creates a debounced async function that prevents concurrent executions
 * and delays invoking until after wait milliseconds have elapsed.
 * 
 * @param func The async function to debounce
 * @param wait The number of milliseconds to delay
 * @returns A debounced version of the original async function
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  let isRunning = false;
  
  return function(...args: Parameters<T>): void {
    // Don't schedule if already running
    if (isRunning) return;
    
    const later = () => {
      timeout = null;
      if (!isRunning) {
        isRunning = true;
        func(...args)
          .finally(() => {
            isRunning = false;
          });
      }
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = window.setTimeout(later, wait);
  };
}

/**
 * Throttles a function to only execute once within the specified time period
 * 
 * @param func The function to throttle
 * @param limit The time limit in milliseconds
 * @returns A throttled version of the original function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;
  let timeout: number | null = null;
  
  return function(...args: Parameters<T>): void {
    const now = Date.now();
    const remaining = limit - (now - lastRun);
    
    if (remaining <= 0) {
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastRun = now;
      func(...args);
    } else if (timeout === null) {
      timeout = window.setTimeout(() => {
        lastRun = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
}
