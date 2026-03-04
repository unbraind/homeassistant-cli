export function withExit<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    await fn(...args);
    process.exit(0);
  }) as any as T;
}
