// Changer le programme d'un jour (18/11/2026) : pas cours, malade, blessé, imprévu, repos.
// Les changements sont synchronisés (clé « prog:jours ») et pris en compte par le placement du sport et
// des révisions : cours retirés, créneaux bloqués, séances interdites. Voir replanifier.ts.
import type { Cours, Tache } from './api'
import type { CodeSeance } from './programme'
import { parcoursDe } from './programme'
import { creerStock, jourIso, uid } from './stockage'

export type TypeChangement = 'pas_cours' | 'malade' | 'blesse' | 'indispo' | 'repos'
export type NiveauSport = 'normal' | 'adapte' | 'leger' | 'non'
export type NiveauRevisions = 'normal' | 'allege' | 'non'
export type Zone = 'haut' | 'bas' | 'dos' | 'autre'

export type Changement = {
    id: string
    type: TypeChangement
    du: string // AAAA-MM-JJ
    au: string // AAAA-MM-JJ (inclus)
    coursSautes?: 'tous' | string[] // ids des cours qui n'ont pas lieu (ou où Daniel ne va pas)
    sport: NiveauSport
    revisions: NiveauRevisions
    zone?: Zone
    debut?: string // HH:MM (imprévu)
    fin?: string
    note?: string
    cree: string
}

export const TYPES: Record<TypeChangement, { emoji: string; libelle: string; court: string }> = {
    pas_cours: { emoji: '🏖️', libelle: 'Pas cours / cours annulé', court: 'pas cours' },
    malade: { emoji: '🤒', libelle: 'Je suis malade', court: 'malade' },
    blesse: { emoji: '🤕', libelle: 'Je suis blessé', court: 'blessé' },
    indispo: { emoji: '⏰', libelle: 'Un imprévu (pas dispo à une heure)', court: 'imprévu' },
    repos: { emoji: '😴', libelle: 'Besoin de repos (pas de sport)', court: 'repos' },
}

export const ZONES: Record<Zone, string> = { haut: 'Haut du corps (bras, épaules, poignet…)', bas: 'Bas du corps (genou, cheville…)', dos: 'Dos', autre: 'Autre' }

type Etat = { updatedAt: number; changements: Changement[] }
export const stockJours = creerStock<Etat>('jours.changements', 'prog:jours', () => ({ updatedAt: 0, changements: [] }))

export function lireChangements(): Changement[] {
    // on oublie ce qui est fini depuis plus de 30 jours
    const limite = jourIso(new Date(Date.now() - 30 * 86400000))
    return stockJours.lire().changements.filter((c) => c.au >= limite)
}

export function ajouterChangement(c: Omit<Changement, 'id' | 'cree'>): Changement {
    const n: Changement = { ...c, id: uid(), cree: new Date().toISOString() }
    stockJours.modifier((e) => ({ ...e, changements: [...e.changements.filter((x) => x.au >= jourIso(new Date(Date.now() - 30 * 86400000))), n] }))
    return n
}

export function supprimerChangement(id: string): void {
    stockJours.modifier((e) => ({ ...e, changements: e.changements.filter((x) => x.id !== id) }))
}

export const couvre = (c: Changement, jour: Date | string) => {
    const j = typeof jour === 'string' ? jour : jourIso(jour)
    return c.du <= j && j <= c.au
}

export function changementsDu(jour: Date | string): Changement[] {
    return lireChangements().filter((c) => couvre(c, jour))
}

/** Les cours qui ont vraiment lieu (pour Daniel), une fois les changements appliqués. */
export function filtrerCours(cours: Cours[]): Cours[] {
    const ch = lireChangements()
    if (!ch.length) return cours
    return cours.filter((co) => !coursSaute(co, ch))
}

export function coursSaute(co: Cours, ch: Changement[] = lireChangements()): boolean {
    const j = jourIso(new Date(co.date_debut))
    return ch.some((c) => couvre(c, j) && (c.coursSautes === 'tous' || (Array.isArray(c.coursSautes) && c.coursSautes.includes(co.id))))
}

const pseudo = (id: string, titre: string, debut: Date, fin: Date): Tache => ({
    id,
    titre,
    description: null,
    categorie_id: null,
    date_debut: debut.toISOString(),
    date_fin: fin.toISOString(),
    toute_la_journee: false,
    statut: 'a_faire',
    priorite: 'normale',
    source: 'manuel',
    modifiable: false,
    notifie: true,
    categorie_nom: null,
    categorie_couleur: null,
})

const aHeure = (j: Date, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    const d = new Date(j)
    d.setHours(h || 0, m || 0, 0, 0)
    return d
}

/** Créneaux à bloquer (faux événements, jamais enregistrés) pour le placement du sport ou des révisions. */
export function occupationsEnPlus(debut: Date, fin: Date, pour: 'sport' | 'etudes'): Tache[] {
    const res: Tache[] = []
    const ch = lireChangements()
    for (let j = new Date(debut); j <= fin; j = new Date(j.getFullYear(), j.getMonth(), j.getDate() + 1)) {
        for (const c of ch.filter((x) => couvre(x, j))) {
            if (c.type === 'indispo' && c.debut && c.fin) res.push(pseudo(`chg-${c.id}-${jourIso(j)}`, 'Indisponible', aHeure(j, c.debut), aHeure(j, c.fin)))
            if (pour === 'etudes' && c.revisions === 'non') res.push(pseudo(`chg-${c.id}-${jourIso(j)}-r`, 'Pas de révision', aHeure(j, '00:00'), aHeure(j, '23:59')))
            if (pour === 'etudes' && c.revisions === 'allege') {
                // révisions allégées : on garde seulement le début du créneau du soir (≈ 1 h) et rien en journée
                res.push(pseudo(`chg-${c.id}-${jourIso(j)}-a1`, 'Révisions allégées', aHeure(j, '00:00'), aHeure(j, '20:00')))
                res.push(pseudo(`chg-${c.id}-${jourIso(j)}-a2`, 'Révisions allégées', aHeure(j, '21:45'), aHeure(j, '23:59')))
            }
        }
    }
    return res
}

/** Séances de sport interdites ce jour-là (malade, blessé, repos). */
export function interditSport(code: CodeSeance, jour: Date): boolean {
    for (const c of changementsDu(jour)) {
        if (c.sport === 'non') return true
        if (c.sport === 'leger' && code !== 'C') return true
        if (c.sport === 'adapte') {
            const course = code === 'C' && parcoursDe('C') !== 'velo'
            if (c.zone === 'haut' && (code === 'A' || code === 'D')) return true
            if (c.zone === 'bas' && (code === 'B' || course)) return true
            if (c.zone === 'dos' && code !== 'C') return true
            if (c.zone === 'dos' && course) return true
        }
    }
    return false
}

const jourTexte = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })

export function periodeTexte(c: Changement): string {
    return c.du === c.au ? jourTexte(c.du) : `du ${jourTexte(c.du)} au ${jourTexte(c.au)}`
}

/** Une phrase qui résume ce que l'app fait de ce changement. */
export function effetsTexte(c: Changement): string[] {
    const e: string[] = []
    if (c.coursSautes === 'tous') e.push(c.type === 'pas_cours' ? 'pas de cours' : 'tu ne vas pas en cours')
    else if (Array.isArray(c.coursSautes) && c.coursSautes.length) e.push(`${c.coursSautes.length} cours retiré${c.coursSautes.length > 1 ? 's' : ''}`)
    if (c.type === 'indispo' && c.debut && c.fin) e.push(`pas dispo de ${c.debut} à ${c.fin}`)
    if (c.sport === 'non') e.push('pas de sport')
    if (c.sport === 'leger') e.push('seulement du cardio très léger')
    if (c.sport === 'adapte') e.push(`sport adapté (${c.zone === 'haut' ? 'sans le haut du corps' : c.zone === 'bas' ? 'sans les jambes' : c.zone === 'dos' ? 'seulement du vélo tranquille' : 'à voir selon la douleur'})`)
    if (c.revisions === 'allege') e.push('révisions allégées (≈ 1 h le soir)')
    if (c.revisions === 'non') e.push('pas de révision')
    return e
}

/** Pour l'assistant IA : les changements en cours ou à venir. */
export function resumeChangements(): string {
    const auj = jourIso(new Date())
    const l = lireChangements().filter((c) => c.au >= auj)
    return l.length ? `Changements de programme notés par Daniel :\n${l.map((c) => `- ${TYPES[c.type].court} ${periodeTexte(c)} : ${effetsTexte(c).join(', ')}${c.note ? ` (${c.note})` : ''}`).join('\n')}` : ''
}
