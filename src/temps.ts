// Petites aides de mise en forme des durées.
export function duree(minutes: number): string {
    const m = Math.max(0, Math.round(minutes))
    if (m < 60) return `${m} min`
    const h = Math.floor(m / 60)
    const r = m % 60
    return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`
}
