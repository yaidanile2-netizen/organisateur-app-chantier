// Planification automatique des séances de sport autour des cours.
// Le contenu des séances reprend le programme élastiques du site « muscu »
// de Daniel (lundi biceps/pecs, mardi dos/triceps, mercredi jambes/abdos,
// jeudi épaules/trapèzes, samedi full body + cardio), regroupé en
// 3 séances de ~45 min qui couvrent tout le corps chaque semaine.
import type { Cours, Tache } from './api'

export type Seance = { code: 'A' | 'B' | 'C'; titre: string; contenu: string[] }

export const SEANCES: Seance[] = [
    {
        code: 'A',
        titre: 'Haut du corps (pecs, biceps, dos, triceps)',
        contenu: [
            'Échauffement 5 min : rotations des épaules, pompes lentes',
            'Superset 1 · 3 séries : curl biceps / curl marteau',
            'Superset 2 · 3 séries : pompes élastique / fly pectoraux',
            'Superset 3 · 3 séries : lat pulldown / rowing dos',
            'Superset 4 · 3 séries : extension triceps overhead / finger grip',
            'Finisher cardio 6 min : 30 s montées de genoux, 30 s repos',
            'Étirements 3 min',
        ],
    },
    {
        code: 'B',
        titre: 'Jambes, abdos et épaules',
        contenu: [
            'Échauffement 5 min : squats à vide, mobilité des hanches',
            'Superset 1 · 3 séries : squat élastique / fentes avant',
            'Superset 2 · 3 séries : planche gainage / crunch élastique',
            'Superset 3 · 3 séries : élévations latérales / face pull',
            'Superset 4 · 3 séries : haussements / overhead press',
            'Finisher cardio 6 min : 30 s jumping jacks, 30 s repos',
            'Étirements 3 min',
        ],
    },
    {
        code: 'C',
        titre: 'Full body intensif + cardio',
        contenu: [
            'Échauffement 5 min',
            '4 séries : squat lourd, fentes + deadlift, press + élévations',
            '4 séries : pompes lestées, lat pull + rowing, curl + planche',
            'Cardio 10 min : course, corde à sauter ou vélo',
            'Étirements 3 min',
        ],
    },
]

// Repère ajouté dans la description des séances créées automatiquement,
// pour pouvoir les retrouver (et les remplacer) en reprogrammant la semaine.
export const MARQUEUR = '#sport-auto'

export const DUREE_MIN = 45
const PAS_MIN = 15
const MARGE_AVANT_COURS = 45 // douche + trajet avant un cours
const MARGE_APRES_COURS = 30 // trajet retour après un cours
const MARGE_TACHE = 15
const DELAI_MIN_AVANT_DEBUT = 60 // ne jamais proposer une séance qui commence dans moins d'1 h

export type Creneau = { seance: Seance; debut: Date; fin: Date }

type Intervalle = { debut: number; fin: number }
type MeilleurDuJour = { jour: Date; debut: Date; score: number }

const MIN = 60 * 1000

function plageDuJour(jour: Date): Intervalle {
    const weekend = jour.getDay() === 0 || jour.getDay() === 6
    const d = new Date(jour)
    d.setHours(weekend ? 9 : 7, 0, 0, 0)
    const f = new Date(jour)
    f.setHours(weekend ? 20 : 21, weekend ? 0 : 30, 0, 0)
    return { debut: d.getTime(), fin: f.getTime() }
}

// Préférence horaire : fin d'après-midi en semaine, fin de matinée le week-end.
function scoreHeure(debut: Date): number {
    const h = debut.getHours() + debut.getMinutes() / 60
    const weekend = debut.getDay() === 0 || debut.getDay() === 6
    if (weekend && h >= 10 && h <= 12) return 10
    if (h >= 17.5 && h <= 19.5) return 10
    if (h >= 16.5 && h < 17.5) return 8
    if (h > 19.5 && h <= 20.5) return 7
    if (h >= 7 && h <= 8) return 6
    return 3
}

export function occupations(cours: Cours[], taches: Tache[]): Intervalle[] {
    const occ: Intervalle[] = []
    for (const c of cours) {
        occ.push({
            debut: new Date(c.date_debut).getTime() - MARGE_AVANT_COURS * MIN,
            fin: new Date(c.date_fin).getTime() + MARGE_APRES_COURS * MIN,
        })
    }
    for (const t of taches) {
        if (!t.date_debut || t.toute_la_journee || t.statut === 'annule') continue
        const debut = new Date(t.date_debut).getTime()
        const fin = t.date_fin ? new Date(t.date_fin).getTime() : debut + 60 * MIN
        occ.push({ debut: debut - MARGE_TACHE * MIN, fin: fin + MARGE_TACHE * MIN })
    }
    return occ
}

function meilleurCreneauDuJour(jour: Date, occ: Intervalle[], maintenant: Date): MeilleurDuJour | null {
    const plage = plageDuJour(jour)
    const auPlusTot = maintenant.getTime() + DELAI_MIN_AVANT_DEBUT * MIN
    let meilleur: MeilleurDuJour | null = null
    for (let t = plage.debut; t + DUREE_MIN * MIN <= plage.fin; t += PAS_MIN * MIN) {
        if (t < auPlusTot) continue
        const fin = t + DUREE_MIN * MIN
        if (occ.some((o) => t < o.fin && fin > o.debut)) continue
        const debut = new Date(t)
        const score = scoreHeure(debut)
        if (!meilleur || score > meilleur.score) meilleur = { jour, debut, score }
    }
    return meilleur
}

function ecartJours(a: Date, b: Date): number {
    const ja = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
    const jb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
    return Math.round((jb - ja) / (24 * 60 * MIN))
}

// Note d'une combinaison de jours : qualité des horaires + jours de repos
// entre les séances (récupération), dimanche évité (repos dans le programme).
function noteCombinaison(choix: MeilleurDuJour[]): number {
    let note = 0
    for (const c of choix) {
        note += c.score
        if (c.jour.getDay() === 0) note -= 4
    }
    for (let i = 1; i < choix.length; i++) {
        const ecart = ecartJours(choix[i - 1].jour, choix[i].jour)
        note += ecart >= 2 ? 8 : 0
    }
    return note
}

function combinaisons<T>(liste: T[], k: number): T[][] {
    if (k === 0) return [[]]
    if (liste.length < k) return []
    const [tete, ...reste] = liste
    return [
        ...combinaisons(reste, k - 1).map((c) => [tete, ...c]),
        ...combinaisons(reste, k),
    ]
}

export function debutDeSemaine(date: Date): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const decalage = (d.getDay() + 6) % 7 // lundi = 0
    d.setDate(d.getDate() - decalage)
    return d
}

export function planifierSemaine(
    lundi: Date,
    cours: Cours[],
    taches: Tache[],
    maintenant: Date = new Date(),
): Creneau[] {
    const occ = occupations(cours, taches)
    const candidats: MeilleurDuJour[] = []
    for (let i = 0; i < 7; i++) {
        const jour = new Date(lundi)
        jour.setDate(lundi.getDate() + i)
        const m = meilleurCreneauDuJour(jour, occ, maintenant)
        if (m) candidats.push(m)
    }
    const nb = Math.min(SEANCES.length, candidats.length)
    let meilleure: MeilleurDuJour[] = []
    let meilleureNote = -Infinity
    for (const combo of combinaisons(candidats, nb)) {
        const note = noteCombinaison(combo)
        if (note > meilleureNote) {
            meilleureNote = note
            meilleure = combo
        }
    }
    return meilleure.map((m, i) => ({
        seance: SEANCES[i],
        debut: m.debut,
        fin: new Date(m.debut.getTime() + DUREE_MIN * MIN),
    }))
}

export function descriptionSeance(s: Seance): string {
    return `${s.contenu.map((l) => `• ${l}`).join('\n')}\n\nProgramme élastiques — ${MARQUEUR}`
}
