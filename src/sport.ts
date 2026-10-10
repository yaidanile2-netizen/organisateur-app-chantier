// Planification automatique des séances à la salle (Basic-Fit) autour des cours.
// Modèle « depuis la maison » : après un cours, Daniel rentre chez lui (trajet IUT),
// puis va à la salle (trajet salle), fait sa séance et rentre, avant l'heure limite.
import type { Cours, Tache } from './api'
import { PROGRAMME, type SeanceProgramme } from './programme'

export const MARQUEUR = '#sport-auto'

export type Reglages = {
    trajetIut: number // minutes entre l'IUT et la maison
    trajetSalle: number // minutes maison → salle (même durée au retour)
    duree: number // minutes de séance
    retourAvant: string // 'HH:MM' : être rentré à la maison avant
    departAuPlusTot: string // 'HH:MM' : ne pas partir de la maison avant
}

export const REGLAGES_PAR_DEFAUT: Reglages = {
    trajetIut: 90,
    trajetSalle: 30,
    duree: 30,
    retourAvant: '20:00',
    departAuPlusTot: '08:00',
}

const CLE_REGLAGES = 'sport.reglages'

export function lireReglages(): Reglages {
    try {
        const brut = localStorage.getItem(CLE_REGLAGES)
        if (brut) return { ...REGLAGES_PAR_DEFAUT, ...JSON.parse(brut) }
    } catch {
        // stockage indisponible : réglages par défaut
    }
    return REGLAGES_PAR_DEFAUT
}

export function enregistrerReglages(r: Reglages): void {
    try {
        localStorage.setItem(CLE_REGLAGES, JSON.stringify(r))
    } catch {
        // stockage indisponible : les réglages restent valables pour cette session
    }
}

const PAS_MIN = 15
const MARGE_TACHE = 15
const DELAI_MIN_AVANT_DEPART = 30 // ne jamais proposer un départ dans moins de 30 min
const MIN = 60 * 1000

export type Creneau = {
    seance: SeanceProgramme
    depart: Date // départ de la maison
    debut: Date // début de la séance à la salle
    fin: Date // fin de la séance
    retour: Date // retour à la maison
}

type Intervalle = { debut: number; fin: number }
type MeilleurDuJour = { jour: Date; depart: number; score: number }

function aHeure(jour: Date, hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number)
    const d = new Date(jour)
    d.setHours(h || 0, m || 0, 0, 0)
    return d.getTime()
}

// Préférence sur l'heure de début de la séance.
function scoreHeure(debut: Date): number {
    const h = debut.getHours() + debut.getMinutes() / 60
    const weekend = debut.getDay() === 0 || debut.getDay() === 6
    if (weekend) return h >= 10 && h <= 12 ? 10 : h > 12 && h <= 18 ? 8 : 6
    if (h >= 17 && h <= 19) return 10
    if (h >= 15 && h < 17) return 8
    return 5
}

// Périodes où Daniel n'est pas disponible pour un aller-retour à la salle :
// chaque cours compte avec le trajet IUT avant et après, chaque tâche avec 15 min de marge.
export function absences(cours: Cours[], taches: Tache[], r: Reglages): Intervalle[] {
    const occ: Intervalle[] = []
    for (const c of cours) {
        occ.push({
            debut: new Date(c.date_debut).getTime() - r.trajetIut * MIN,
            fin: new Date(c.date_fin).getTime() + r.trajetIut * MIN,
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

function meilleurDepartDuJour(jour: Date, occ: Intervalle[], r: Reglages, maintenant: Date): MeilleurDuJour | null {
    const total = (2 * r.trajetSalle + r.duree) * MIN
    const premier = Math.max(aHeure(jour, r.departAuPlusTot), maintenant.getTime() + DELAI_MIN_AVANT_DEPART * MIN)
    const dernierRetour = aHeure(jour, r.retourAvant)
    // Salle ouverte 6h00–22h30
    const ouverture = aHeure(jour, '06:00')
    const fermeture = aHeure(jour, '22:30')
    let meilleur: MeilleurDuJour | null = null
    const debutGrille = aHeure(jour, '00:00')
    for (let t = debutGrille; t + total <= dernierRetour; t += PAS_MIN * MIN) {
        if (t < premier) continue
        const debutSeance = t + r.trajetSalle * MIN
        const finSeance = debutSeance + r.duree * MIN
        if (debutSeance < ouverture || finSeance > fermeture) continue
        if (occ.some((o) => t < o.fin && t + total > o.debut)) continue
        const score = scoreHeure(new Date(debutSeance))
        if (!meilleur || score > meilleur.score) meilleur = { jour, depart: t, score }
    }
    return meilleur
}

function ecartJours(a: Date, b: Date): number {
    const ja = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
    const jb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
    return Math.round((jb - ja) / (24 * 60 * MIN))
}

// Qualité des horaires + un jour de repos entre deux séances quand c'est possible.
function noteCombinaison(choix: MeilleurDuJour[]): number {
    let note = 0
    for (const c of choix) {
        note += c.score
        if (c.jour.getDay() === 0) note -= 2
    }
    for (let i = 1; i < choix.length; i++) {
        note += ecartJours(choix[i - 1].jour, choix[i].jour) >= 2 ? 8 : 0
    }
    return note
}

function combinaisons<T>(liste: T[], k: number): T[][] {
    if (k === 0) return [[]]
    if (liste.length < k) return []
    const [tete, ...reste] = liste
    return [...combinaisons(reste, k - 1).map((c) => [tete, ...c]), ...combinaisons(reste, k)]
}

export function debutDeSemaine(date: Date): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // lundi
    return d
}

export function planifierSemaine(
    lundi: Date,
    cours: Cours[],
    taches: Tache[],
    r: Reglages = REGLAGES_PAR_DEFAUT,
    maintenant: Date = new Date(),
): Creneau[] {
    const occ = absences(cours, taches, r)
    const candidats: MeilleurDuJour[] = []
    for (let i = 0; i < 7; i++) {
        const jour = new Date(lundi)
        jour.setDate(lundi.getDate() + i)
        const m = meilleurDepartDuJour(jour, occ, r, maintenant)
        if (m) candidats.push(m)
    }
    const nb = Math.min(PROGRAMME.length, candidats.length)
    let meilleure: MeilleurDuJour[] = []
    let meilleureNote = -Infinity
    for (const combo of combinaisons(candidats, nb)) {
        const note = noteCombinaison(combo)
        if (note > meilleureNote) {
            meilleureNote = note
            meilleure = combo
        }
    }
    return meilleure.map((m, i) => {
        const depart = m.depart
        const debut = depart + r.trajetSalle * MIN
        const fin = debut + r.duree * MIN
        return {
            seance: PROGRAMME[i],
            depart: new Date(depart),
            debut: new Date(debut),
            fin: new Date(fin),
            retour: new Date(fin + r.trajetSalle * MIN),
        }
    })
}

const hm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function titreSeance(s: SeanceProgramme): string {
    return `Salle · Séance ${s.code} — ${s.titre}`
}

export function descriptionSeance(c: Creneau): string {
    const s = c.seance
    const exos = s.blocs.flatMap((b) => b.exercices.map((e) => `• ${e.nom} — ${e.series} × ${e.reps}`))
    return [
        `Départ ${hm(c.depart)} · séance ${hm(c.debut)}–${hm(c.fin)} au Basic-Fit Atlantis · retour vers ${hm(c.retour)}`,
        '',
        ...exos,
        '',
        `Détail, charges et minuteur dans l’onglet Muscu — ${MARQUEUR} ${s.code}`,
    ].join('\n')
}

// Retrouve la séance (A/B/C) d'une tâche créée automatiquement.
export function codeDeTache(t: Tache): 'A' | 'B' | 'C' | null {
    const m = (t.description || '').match(/#sport-auto ([ABC])/)
    if (m) return m[1] as 'A' | 'B' | 'C'
    const m2 = t.titre.match(/Séance ([ABC])/)
    return m2 ? (m2[1] as 'A' | 'B' | 'C') : null
}
