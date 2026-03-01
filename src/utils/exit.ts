// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withExit<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    await fn(...args);
    process.exit(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any as T;
}
