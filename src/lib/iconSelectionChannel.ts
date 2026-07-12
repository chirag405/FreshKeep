type Listener = (icon: string) => void;

let listener: Listener | null = null;

export function onIconSelected(fn: Listener): void {
  listener = fn;
}

export function clearIconListener(): void {
  listener = null;
}

export function emitIconSelected(icon: string): void {
  listener?.(icon);
}
