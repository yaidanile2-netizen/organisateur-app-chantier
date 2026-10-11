// Type des cours IUT (fourni par l'emploi du temps) et code couleur choisi par Daniel :
// DS bleu ciel · CM rouge · TD vert clair · TP bleu cyan · autonomie violet.
import type { Cours } from './api'

export type CleType = 'ds' | 'cm' | 'td' | 'tp' | 'autonomie' | 'autre'

export type InfoType = { cle: CleType; court: string; libelle: string; couleur: string }

const TYPES: Record<CleType, Omit<InfoType, 'libelle'>> = {
    ds: { cle: 'ds', court: 'DS', couleur: '#38bdf8' },
    cm: { cle: 'cm', court: 'CM', couleur: '#ef4444' },
    td: { cle: 'td', court: 'TD', couleur: '#4ade80' },
    tp: { cle: 'tp', court: 'TP', couleur: '#06b6d4' },
    autonomie: { cle: 'autonomie', court: 'AUTO', couleur: '#8b5cf6' },
    autre: { cle: 'autre', court: '•', couleur: '#94a3b8' },
}

export const LEGENDE: InfoType[] = [
    { ...TYPES.ds, libelle: 'DS / contrôle' },
    { ...TYPES.cm, libelle: 'CM' },
    { ...TYPES.td, libelle: 'TD' },
    { ...TYPES.tp, libelle: 'TP' },
    { ...TYPES.autonomie, libelle: 'Autonomie' },
]

export function cleDuType(type: string | null | undefined): CleType {
    const t = (type || '').toLowerCase()
    if (/contr[ôo]le|\bds\b|examen|partiel|rattrapage|soutenance|oral/.test(t)) return 'ds'
    if (/\bcm\b|magistral/.test(t)) return 'cm'
    if (/\btp\b|pratique/.test(t)) return 'tp'
    if (/\btd\b|dirig/.test(t)) return 'td'
    if (/autonomie/.test(t)) return 'autonomie'
    return 'autre'
}

export function typeDe(c: Cours): InfoType {
    const cle = cleDuType(c.type)
    const base = TYPES[cle]
    const libelle = c.type ? c.type.replace(/^Contrôle continu/i, 'Contrôle continu') : 'Cours'
    // Une évaluation garde son libellé exact (Contrôle continu TD, Soutenance…) mais la couleur des DS.
    return { ...base, court: cle === 'ds' && /soutenance/i.test(c.type || '') ? 'ORAL' : base.court, libelle }
}

/** « MT-R3.OPTIM.11-Communication 3 et PPP » → « Communication 3 et PPP ». */
export function nomModule(titre: string): string {
    const m = titre.match(/^[A-Z]{1,4}(?:-[A-Z])?-[A-Z]?\d[\w.]*-(.+)$/)
    return (m ? m[1] : titre).trim()
}

/** Code du module (« R3.OPTIM.11 ») s'il y en a un. */
export function codeModule(titre: string): string | null {
    const m = titre.match(/^[A-Z]{1,4}(?:-[A-Z])?-([A-Z]?\d[\w.]*)-/)
    return m ? m[1] : null
}

/** Enseignant(s) et groupes à partir de la description « NOM Prénom - GROUPE ; GROUPE ». */
export function detailsCours(c: Cours): { profs: string | null; groupes: string | null } {
    const [premiere] = (c.description || '').split('\n')
    const [profs, ...reste] = premiere.split(' - ')
    return { profs: profs.trim() || null, groupes: (c.groupes || reste.join(' - ')).trim() || null }
}
