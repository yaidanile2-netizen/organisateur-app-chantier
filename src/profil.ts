// Profil physique et charges de départ conseillées pour chaque exercice.
// Ce sont des repères pour une première séance (10-12 reps en gardant 2-3 reps en réserve) :
// la vraie charge s'ajuste ensuite avec le bilan de séance (+1 cran quand c'est facile).
import type { Exercice } from './programme'

export type Niveau = 'debutant' | 'intermediaire' | 'confirme'

export type Profil = {
    tailleCm: number
    poidsKg: number
    grasPct: number
    naissance: string // 'AAAA-MM'
    niveau: Niveau
}

export const NIVEAUX: Record<Niveau, string> = {
    debutant: 'Débutant',
    intermediaire: 'Quelques mois',
    confirme: 'Plus d’un an',
}

// Profil de Daniel (11/10/2026) : 1,76 m, 67,5 kg, 13 à 16 % de gras, 18 ans (19 en janvier), débutant.
export const PROFIL_PAR_DEFAUT: Profil = { tailleCm: 176, poidsKg: 67.5, grasPct: 14.5, naissance: '2008-01', niveau: 'debutant' }

const CLE = 'muscu.profil'

export function lireProfil(): Profil {
    try {
        const brut = localStorage.getItem(CLE)
        if (brut) return { ...PROFIL_PAR_DEFAUT, ...JSON.parse(brut) }
    } catch {
        // stockage indisponible
    }
    return PROFIL_PAR_DEFAUT
}

export function enregistrerProfil(p: Profil): void {
    try {
        localStorage.setItem(CLE, JSON.stringify(p))
    } catch {
        // stockage indisponible
    }
}

export function ageDe(p: Profil, aujourdhui: Date): number {
    const [a, m] = p.naissance.split('-').map(Number)
    if (!a) return 20
    let age = aujourdhui.getFullYear() - a
    if (aujourdhui.getMonth() + 1 < (m || 1)) age -= 1
    return age
}

export type Mesures = { imc: number; masseMaigre: number; fcMax: number; age: number }

export function mesures(p: Profil, aujourdhui: Date): Mesures {
    const age = ageDe(p, aujourdhui)
    const m = p.tailleCm / 100
    return {
        age,
        imc: p.poidsKg / (m * m),
        masseMaigre: p.poidsKg * (1 - p.grasPct / 100),
        // Formule de Tanaka : 208 − 0,7 × âge.
        fcMax: Math.round(208 - 0.7 * age),
    }
}

// Charge de travail d'un débutant (10-12 reps) en fraction de la « masse de référence ».
const RATIOS: Record<string, number> = {
    'a-chest-press': 0.35,
    'a-lat-pulldown': 0.45,
    'a-shoulder-press': 0.2,
    'a-seated-row': 0.45,
    'a-curl-poulie': 0.12,
    'a-triceps-corde': 0.15,
    'b-leg-press': 1.0,
    'b-leg-curl': 0.3,
    'b-leg-extension': 0.35,
    'b-mollets': 0.8,
    'b-crunch': 0.25,
}
const FACTEUR_NIVEAU: Record<Niveau, number> = { debutant: 1, intermediaire: 1.3, confirme: 1.6 }

function facteurAge(age: number): number {
    if (age < 18) return 0.9
    if (age < 20) return 0.95 // encore en croissance : technique d'abord
    if (age <= 40) return 1
    return 0.95
}

const arrondi = (kg: number) => Math.max(2.5, Math.round(kg / 2.5) * 2.5)

export type Recommandation =
    | { type: 'charge'; min: number; max: number }
    | { type: 'texte'; texte: string }

export function recommandation(e: Exercice, p: Profil, aujourdhui: Date): Recommandation | null {
    const { age, masseMaigre, fcMax } = mesures(p, aujourdhui)
    const ratio = RATIOS[e.id]
    if (ratio !== undefined) {
        // La force suit surtout la masse maigre : on la ramène à un corps « type » à 15 % de gras.
        const reference = (masseMaigre / 0.85) * facteurAge(age) * FACTEUR_NIVEAU[p.niveau]
        const cible = reference * ratio
        return { type: 'charge', min: arrondi(cible * 0.85), max: arrondi(cible * 1.05) }
    }
    const fc = (a: number, b: number) => `${Math.round(fcMax * a)}–${Math.round(fcMax * b)} bpm`
    if (e.id === 'c-fractionne') return { type: 'texte', texte: `❤️ Rapide : ${fc(0.85, 0.9)} · lent : ${fc(0.6, 0.7)}` }
    if (e.id === 'c-marche-inclinee') return { type: 'texte', texte: `❤️ Vise ${fc(0.65, 0.75)}` }
    if (e.materiel === 'elastique') {
        const el = { debutant: 'léger', intermediaire: 'moyen', confirme: 'fort' }[p.niveau]
        return { type: 'texte', texte: `🎗️ Élastique ${el} : finis avec 2-3 reps en réserve` }
    }
    if (e.id === 'd-pompes') {
        const t = { debutant: '6 à 10 reps, genoux au sol si besoin', intermediaire: '10 à 15 reps', confirme: '15 à 20 reps' }[p.niveau]
        return { type: 'texte', texte: `🤸 ${t}` }
    }
    if (e.id === 'b-planche') {
        const t = { debutant: '20 à 30 s', intermediaire: '40 s', confirme: '60 s' }[p.niveau]
        return { type: 'texte', texte: `⏱️ Vise ${t} bien gainé` }
    }
    return null
}
