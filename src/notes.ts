// Notes rapides (18/11/2026) : synchronisées entre appareils (clé « prog:notes »).
// Les rappels, eux, sont des tâches datées (description « #rappel ») : c'est ce qui déclenche la notification.
import { creerStock, uid } from './stockage'

export const MARQUEUR_RAPPEL = '#rappel'
export type Note = { id: string; texte: string; date: string; fait?: boolean }
type Etat = { updatedAt: number; notes: Note[]; supprimees: string[] }

// Fusion : union des notes des deux côtés (une note supprimée ailleurs ne revient pas).
export const stockNotes = creerStock<Etat>(
    'notes.liste',
    'prog:notes',
    () => ({ updatedAt: 0, notes: [], supprimees: [] }),
    (local, enLigne) => {
        const sup = [...new Set([...(local.supprimees ?? []), ...(enLigne.supprimees ?? [])])].slice(-300)
        const parId = new Map<string, Note>()
        const recent = (local.updatedAt || 0) >= (enLigne.updatedAt || 0)
        for (const n of recent ? [...enLigne.notes, ...local.notes] : [...local.notes, ...enLigne.notes]) parId.set(n.id, n)
        return { updatedAt: 0, supprimees: sup, notes: [...parId.values()].filter((n) => !sup.includes(n.id)).sort((a, b) => b.date.localeCompare(a.date)) }
    },
)

export const lireNotes = () => stockNotes.lire().notes

export function ajouterNote(texte: string): Note {
    const n: Note = { id: uid(), texte: texte.trim(), date: new Date().toISOString() }
    stockNotes.modifier((e) => ({ ...e, notes: [n, ...e.notes] }))
    return n
}
export function basculerNote(id: string): void {
    stockNotes.modifier((e) => ({ ...e, notes: e.notes.map((n) => (n.id === id ? { ...n, fait: !n.fait } : n)) }))
}
export function supprimerNote(id: string): void {
    stockNotes.modifier((e) => ({ ...e, notes: e.notes.filter((n) => n.id !== id), supprimees: [...(e.supprimees ?? []), id] }))
}

/** « note que … », « note : … », « ajoute une note … » → le texte de la note (sinon null). Les rappels datés restent pour l'IA. */
export function demandeDeNote(message: string): string | null {
    const m = message.trim().match(/^(?:(?:peux[- ]tu|tu peux)\s+)?(?:note(?:r)?|prends? (?:en )?note|ajoute(?:r)? (?:une |à mes )?notes?)\s*(?:que|:|-|,)?\s+(.{3,})$/i)
    if (!m) return null
    const t = m[1].trim().replace(/[.!]+$/, '')
    // « note-moi un rappel demain à 9h » : c'est un rappel daté, on laisse l'IA le créer.
    if (/\brappel/i.test(t) && /\b(\d{1,2}\s*h|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i.test(t)) return null
    return t ? t[0].toUpperCase() + t.slice(1) : null
}

/** Pour l'assistant IA : les notes en cours. */
export function resumeNotes(): string {
    const l = lireNotes().filter((n) => !n.fait).slice(0, 12)
    return l.length ? `Notes de Daniel (pas encore faites) :\n${l.map((n) => `- ${n.texte}`).join('\n')}` : ''
}
