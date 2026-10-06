export function formatVolume(volumeCm3: number): string {
  return `${(volumeCm3 / 1000).toFixed(1)} L`;
}
