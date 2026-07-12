type Listener = (iso: string) => void;

let listener: Listener | null = null;

export function onDateScanned(fn: Listener): void {
  listener = fn;
}

export function clearScanListener(): void {
  listener = null;
}

export function emitDateScanned(iso: string): void {
  listener?.(iso);
}
