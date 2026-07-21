/**
 * Provides shared exit behavior for the Home Assistant CLI runtime.
 */
export function withExit<Arguments extends unknown[]>(
  fn: (...args: Arguments) => Promise<void>
): (...args: Arguments) => Promise<void> {
  return async (...args: Arguments): Promise<void> => {
    await fn(...args);
  };
}
