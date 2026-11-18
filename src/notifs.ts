// Historique des notifications (18/11/2026) : le service worker note chaque notification qu'il affiche
// dans IndexedDB (même origine que l'app) ; l'app les relit pour le bouton 🔔. Gardé 30 jours.
export type Notif = { id?: number; date: string; titre: string; texte: string }

const BASE = 'organisateur'
const MAGASIN = 'notifs'

function ouvrir(): Promise<IDBDatabase> {
    return new Promise((ok, ko) => {
        const r = indexedDB.open(BASE, 1)
        r.onupgradeneeded = () => {
            const db = r.result
            if (!db.objectStoreNames.contains(MAGASIN)) db.createObjectStore(MAGASIN, { keyPath: 'id', autoIncrement: true })
        }
        r.onsuccess = () => ok(r.result)
        r.onerror = () => ko(r.error)
    })
}

export async function noterNotif(n: Notif): Promise<void> {
    try {
        const db = await ouvrir()
        await new Promise<void>((ok) => {
            const tx = db.transaction(MAGASIN, 'readwrite')
            const st = tx.objectStore(MAGASIN)
            st.add(n)
            // ménage : on ne garde que 30 jours
            const limite = new Date(Date.now() - 30 * 86400000).toISOString()
            const c = st.openCursor()
            c.onsuccess = () => {
                const cur = c.result
                if (!cur) return
                if ((cur.value as Notif).date < limite) cur.delete()
                cur.continue()
            }
            tx.oncomplete = () => ok()
            tx.onerror = () => ok()
        })
        db.close()
    } catch {
        // IndexedDB indisponible : tant pis pour l'historique
    }
}

export async function lireNotifs(): Promise<Notif[]> {
    try {
        const db = await ouvrir()
        const l = await new Promise<Notif[]>((ok) => {
            const r = db.transaction(MAGASIN, 'readonly').objectStore(MAGASIN).getAll()
            r.onsuccess = () => ok((r.result as Notif[]) || [])
            r.onerror = () => ok([])
        })
        db.close()
        return l.sort((a, b) => b.date.localeCompare(a.date))
    } catch {
        return []
    }
}

export async function viderNotifs(): Promise<void> {
    try {
        const db = await ouvrir()
        await new Promise<void>((ok) => {
            const tx = db.transaction(MAGASIN, 'readwrite')
            tx.objectStore(MAGASIN).clear()
            tx.oncomplete = () => ok()
            tx.onerror = () => ok()
        })
        db.close()
    } catch {
        // rien
    }
}
