// Photos de repas (27/11/2026) : la photo est réduite sur le téléphone avant l'envoi au coach
// (≈ 1024 px, JPEG) : rapide à envoyer, assez nette pour reconnaître le plat. Une miniature reste dans la conversation.
async function charger(f: File): Promise<CanvasImageSource & { width: number; height: number }> {
    try {
        return await createImageBitmap(f, { imageOrientation: 'from-image' })
    } catch {
        const url = URL.createObjectURL(f)
        try {
            const img = new Image()
            img.src = url
            await img.decode()
            return img
        } finally {
            URL.revokeObjectURL(url)
        }
    }
}

function versJpeg(img: CanvasImageSource & { width: number; height: number }, max: number, qualite: number): string {
    const k = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * k)
    c.height = Math.round(img.height * k)
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('Image illisible')
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', qualite)
}

export type PhotoRepas = { grande: string; mini: string }

export async function preparerPhoto(f: File): Promise<PhotoRepas> {
    if (!f.type.startsWith('image/')) throw new Error('Ce fichier n’est pas une image.')
    const img = await charger(f)
    return { grande: versJpeg(img, 1024, 0.8), mini: versJpeg(img, 220, 0.7) }
}
