// Quotas du jour : calories selon la priorité n°1 et la dépense mesurée par la montre,
// sucres ajoutés (repères OMS) et graisses saturées (10 % de l'énergie).
// Même calcul que le coach côté n8n (nœud « Preparer prompt nutrition »).
import type { ApportsJour, Objectif, SanteJour } from './api'
import { ageDe, lireProfil } from './profil'

export const SUCRES_IDEAL = 25
export const SUCRES_MAX = 50
const ACTIVITE_PAR_DEFAUT = 300

export const BONUS: Record<Objectif, { kcal: number; texte: string }> = {
    musculation: { kcal: 250, texte: 'léger surplus pour construire du muscle' },
    croissance: { kcal: 250, texte: 'léger surplus pour bien grandir et récupérer' },
    cardio: { kcal: 100, texte: 'un peu plus pour l’endurance' },
    perte_gras: { kcal: -300, texte: 'léger déficit pour perdre du gras doucement' },
    peau: { kcal: 0, texte: 'maintien' },
}

export const jourParis = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })

export type Quotas = {
    kcal: number
    gras: number
    base: number
    actives: number
    activesMesurees: boolean
    bonus: number
    priorite: Objectif
}

export function quotasDuJour(priorite: Objectif, sante: SanteJour | null, aujourdhui = new Date()): Quotas {
    const p = lireProfil()
    const metabo = 10 * p.poidsKg + 6.25 * p.tailleCm - 5 * ageDe(p, aujourdhui) + 5
    const base = metabo * 1.3
    const mesurees = !!sante && (sante.kcal_actives ?? 0) > 0
    const actives = mesurees ? Number(sante!.kcal_actives) : ACTIVITE_PAR_DEFAUT
    const bonus = BONUS[priorite]?.kcal ?? 0
    const kcal = Math.round((base + actives + bonus) / 50) * 50
    return { kcal, gras: Math.round((kcal * 0.1) / 9), base: Math.round(base), actives, activesMesurees: mesurees, bonus, priorite }
}

export type Niveau = 'ok' | 'attention' | 'trop'

export function niveauSucres(g: number): Niveau {
    if (g <= SUCRES_IDEAL) return 'ok'
    if (g <= SUCRES_MAX) return 'attention'
    return 'trop'
}

export function apportsDu(jours: ApportsJour[], jour: string): ApportsJour {
    return jours.find((j) => j.jour === jour) ?? { jour, kcal: 0, sucres: 0, gras: 0, repas: 0, prises: 0 }
}
