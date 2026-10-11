// Suivi muscu : cache sur l'appareil, file d'attente hors ligne, et conseils de progression.
import { envoyerMuscu, type EtatMuscu, type ExoFait, type Ressenti, type SeanceFaite } from './api'
import { PROGRAMME, type CodeSeance, type Exercice } from './programme'

export const RESSENTIS: Record<Ressenti, { emoji: string; libelle: string }> = {
    dur: { emoji: '🥵', libelle: 'Dur' },
    bien: { emoji: '👍', libelle: 'Bien' },
    facile: { emoji: '😎', libelle: 'Facile' },
}

export const PAS_KG = 2.5

function lire<T>(cle: string, defaut: T): T {
    try {
        const brut = localStorage.getItem(cle)
        return brut ? (JSON.parse(brut) as T) : defaut
    } catch {
        return defaut
    }
}
function ecrire(cle: string, valeur: unknown): void {
    try {
        localStorage.setItem(cle, JSON.stringify(valeur))
    } catch {
        // stockage indisponible
    }
}

const EXERCICES: Record<string, Exercice> = Object.fromEntries(
    PROGRAMME.flatMap((s) => s.blocs.flatMap((b) => b.exercices)).map((e) => [e.id, e])
)
export const exerciceParId = (id: string): Exercice | undefined => EXERCICES[id]
export const avecCharge = (e: Exercice) => e.materiel === 'machine' || e.materiel === 'poulie'

export function versKg(v: string | number | null | undefined): number | null {
    const n = Math.round(Number(String(v ?? '').replace(',', '.')) * 2) / 2
    return Number.isFinite(n) && n > 0 ? n : null
}

// --- Cache local (affichage immédiat, et secours hors ligne) ---

export function lireCache(): EtatMuscu {
    const charges = lire<Record<string, string | number>>('muscu.charges', {})
    const propres: Record<string, number> = {}
    for (const [id, v] of Object.entries(charges)) {
        const kg = versKg(v)
        if (kg !== null) propres[id] = kg
    }
    return { charges: propres, seances: lire<SeanceFaite[]>('muscu.seances', []) }
}

export function ecrireCache(etat: EtatMuscu): void {
    ecrire('muscu.charges', etat.charges)
    ecrire('muscu.seances', etat.seances.slice(0, 80))
}

// --- File d'attente : ce qui n'a pas pu partir (pas de réseau) ---

type Attente = { charges: Record<string, number | null>; seances: Omit<SeanceFaite, 'id'>[] }
const lireAttente = () => lire<Attente>('muscu.attente', { charges: {}, seances: [] })

export function mettreEnAttente(a: Partial<Attente>): void {
    const actuelle = lireAttente()
    ecrire('muscu.attente', {
        charges: { ...actuelle.charges, ...a.charges },
        seances: [...actuelle.seances, ...(a.seances || [])],
    })
}

// --- Synchronisation au chargement ---

/** Envoie ce qui attendait, reprend les anciennes données de l'appareil si rien n'est en ligne, puis renvoie l'état serveur. */
export async function synchroniser(): Promise<EtatMuscu> {
    const attente = lireAttente()
    for (const s of attente.seances) {
        await envoyerMuscu({ action: 'seance', code: s.code, date: s.date, exercices: s.exercices, charges: {} })
    }
    for (const [id, kg] of Object.entries(attente.charges)) {
        await envoyerMuscu({ action: 'charge', id, kg })
    }
    ecrire('muscu.attente', { charges: {}, seances: [] })

    let etat = await envoyerMuscu({ action: 'etat' })
    if (Object.keys(etat.charges).length === 0 && etat.seances.length === 0) {
        // Première fois : on envoie ce qui était gardé seulement sur cet appareil.
        const cache = lireCache()
        const anciennes = lire<{ date: string; code: CodeSeance }[]>('muscu.historique', [])
        const seances = [
            ...cache.seances.map(({ code, date, exercices }) => ({ code, date, exercices })),
            ...anciennes.map(({ code, date }) => ({ code, date, exercices: [] as ExoFait[] })),
        ]
        if (Object.keys(cache.charges).length || seances.length) {
            etat = await envoyerMuscu({ action: 'import', charges: cache.charges, seances })
        }
    }
    ecrireCache(etat)
    return etat
}

// --- Conseils de progression ---

export type Conseil = { sens: 'monte' | 'descend' | 'garde'; texte: string; kg?: number }

/** Résultats passés d'un exercice, du plus récent au plus ancien. */
export function passesDe(id: string, seances: SeanceFaite[]): (ExoFait & { date: string })[] {
    return seances.flatMap((s) => s.exercices.filter((e) => e.id === id).map((e) => ({ ...e, date: s.date })))
}

const complet = (e: ExoFait) => e.total > 0 && e.faites >= e.total

export function conseilPour(e: Exercice, passes: ExoFait[], chargeActuelle: number | null): Conseil | null {
    const [dernier, avant] = passes
    if (!dernier) return null
    if (avecCharge(e)) {
        const base = dernier.kg ?? chargeActuelle
        if (base === null) return null
        const deuxReussies = avant && complet(avant) && avant.ressenti !== 'dur' && avant.kg === dernier.kg && dernier.ressenti !== 'dur'
        if (complet(dernier) && (dernier.ressenti === 'facile' || deuxReussies)) {
            const kg = base + PAS_KG
            return { sens: 'monte', kg, texte: `Passe à ${fmtKg(kg)} kg` }
        }
        if (!complet(dernier) && dernier.ressenti === 'dur' && avant && !complet(avant) && avant.ressenti === 'dur' && base > PAS_KG) {
            const kg = base - PAS_KG
            return { sens: 'descend', kg, texte: `Redescends à ${fmtKg(kg)} kg` }
        }
        return { sens: 'garde', texte: `Garde ${fmtKg(base)} kg` }
    }
    if (complet(dernier) && dernier.ressenti === 'facile') {
        if (e.materiel === 'cardio') return { sens: 'monte', texte: 'Un peu plus vite sur les minutes rapides' }
        if (e.materiel === 'elastique') return { sens: 'monte', texte: 'Élastique plus dur, ou +2 reps' }
        return { sens: 'monte', texte: '+2 reps par série' }
    }
    return null
}

export const fmtKg = (kg: number) => String(kg).replace('.', ',')
