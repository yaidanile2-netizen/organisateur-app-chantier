// Planification automatique des séances autour des cours : 3 en salle (Basic-Fit) et 1 à la maison.
// Salle — modèle « depuis la maison » : après un cours, Daniel rentre (trajet IUT), va à la salle
// (trajet salle), fait sa séance et rentre avant l'heure limite.
// Maison — pas de trajet : il suffit d'être rentré, la séance doit finir avant l'heure limite maison.
import type { Cours, Tache } from './api'
import { DUREE_SEANCE, PROGRAMME, dureeDe, seanceParCode, type CodeSeance, type SeanceProgramme } from './programme'

export const MARQUEUR = '#sport-auto'

export type Reglages = {
    trajetIut: number // minutes entre l'IUT et la maison
    trajetSalle: number // minutes maison → salle (même durée au retour)
    duree: number // minutes de séance
    retourAvant: string // 'HH:MM' : être rentré de la salle avant
    departAuPlusTot: string // 'HH:MM' : pas de séance qui commence avant (départ pour la salle)
    seanceMaison: boolean // ajouter la séance D à la maison
    maisonAvant: string // 'HH:MM' : séance maison terminée avant
}

export const REGLAGES_PAR_DEFAUT: Reglages = {
    trajetIut: 90,
    trajetSalle: 30,
    duree: DUREE_SEANCE,
    retourAvant: '20:00',
    departAuPlusTot: '08:00',
    seanceMaison: true,
    maisonAvant: '22:00',
}

const CLE_REGLAGES = 'sport.reglages'

export function lireReglages(): Reglages {
    try {
        const brut = localStorage.getItem(CLE_REGLAGES)
        if (brut) {
            const r: Reglages = { ...REGLAGES_PAR_DEFAUT, ...JSON.parse(brut) }
            // Oct. 2026 : les séances passent de 30 à 45 min (nouveau programme par niveaux).
            if (!localStorage.getItem('sport.duree45')) {
                localStorage.setItem('sport.duree45', '1')
                if (r.duree === 30) {
                    r.duree = DUREE_SEANCE
                    localStorage.setItem(CLE_REGLAGES, JSON.stringify(r))
                }
            }
            return r
        }
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
const DELAI_MIN_AVANT_DEBUT = 30 // ne jamais proposer quelque chose qui commence dans moins de 30 min
const MIN = 60 * 1000

export type Creneau = {
    seance: SeanceProgramme
    depart: Date // départ de la maison (= début de séance à la maison)
    debut: Date // début de la séance
    fin: Date // fin de la séance
    retour: Date // retour à la maison (= fin de séance à la maison)
}

type Intervalle = { debut: number; fin: number }
type Option = { depart: number; score: number }

function aHeure(jour: Date, hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number)
    const d = new Date(jour)
    d.setHours(h || 0, m || 0, 0, 0)
    return d.getTime()
}

function estWeekend(d: Date): boolean {
    return d.getDay() === 0 || d.getDay() === 6
}

// Préférence sur l'heure de début d'une séance en salle.
function scoreSalle(debut: Date): number {
    const h = debut.getHours() + debut.getMinutes() / 60
    if (estWeekend(debut)) return h >= 10 && h <= 12 ? 10 : h > 12 && h <= 18 ? 8 : 6
    if (h >= 17 && h <= 19) return 10
    if (h >= 15 && h < 17) return 8
    return 5
}

// Préférence sur l'heure de début d'une séance à la maison.
function scoreMaison(debut: Date): number {
    const h = debut.getHours() + debut.getMinutes() / 60
    if (estWeekend(debut)) return (h >= 10 && h <= 12) || (h >= 17 && h <= 20) ? 9 : 6
    if (h >= 18 && h <= 21) return 10
    if (h >= 17 && h < 18) return 8
    return 5
}

// Périodes où Daniel n'est pas chez lui ou pas disponible : chaque cours avec le trajet IUT
// avant et après, chaque tâche avec 15 min de marge.
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

// Meilleur départ de la journée pour un bloc de `total` minutes qui commence par `avant`
// minutes de trajet ; la séance elle-même dure `duree` minutes.
function meilleurCreneau(
    jour: Date,
    occ: Intervalle[],
    r: Reglages,
    maintenant: Date,
    lieu: 'salle' | 'maison',
    duree: number,
): Option | null {
    const trajet = lieu === 'salle' ? r.trajetSalle : 0
    const total = (2 * trajet + duree) * MIN
    const premier = Math.max(aHeure(jour, r.departAuPlusTot), maintenant.getTime() + DELAI_MIN_AVANT_DEBUT * MIN)
    const limite = aHeure(jour, lieu === 'salle' ? r.retourAvant : r.maisonAvant)
    const ouverture = aHeure(jour, '06:00')
    const fermeture = aHeure(jour, '22:30')
    let meilleur: Option | null = null
    for (let t = aHeure(jour, '00:00'); t + total <= limite; t += PAS_MIN * MIN) {
        if (t < premier) continue
        const debutSeance = t + trajet * MIN
        const finSeance = debutSeance + duree * MIN
        if (lieu === 'salle' && (debutSeance < ouverture || finSeance > fermeture)) continue
        if (occ.some((o) => t < o.fin && t + total > o.debut)) continue
        const score = lieu === 'salle' ? scoreSalle(new Date(debutSeance)) : scoreMaison(new Date(debutSeance))
        if (!meilleur || score > meilleur.score) meilleur = { depart: t, score }
    }
    return meilleur
}

function ecartJours(a: Date, b: Date): number {
    const ja = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
    const jb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
    return Math.round((jb - ja) / (24 * 60 * MIN))
}

export function debutDeSemaine(date: Date): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // lundi
    return d
}

type Choix = { jour: Date; code: CodeSeance; option: Option }

// Note d'un planning : qualité des horaires, jours de repos entre les séances, dimanche un peu
// évité, pas la séance maison (épaules) le lendemain du haut du corps (A), et pas le cardio (C)
// le lendemain des jambes (B).
function noter(choix: Choix[]): number {
    const tries = [...choix].sort((a, b) => a.jour.getTime() - b.jour.getTime())
    let note = 0
    tries.forEach((c, i) => {
        note += c.option.score
        if (c.jour.getDay() === 0) note -= 2
        if (i > 0) {
            const p = tries[i - 1]
            const ecart = ecartJours(p.jour, c.jour)
            if (ecart >= 2) note += 4
            if (ecart === 1 && p.code === 'A' && c.code === 'D') note -= 3
            if (ecart === 1 && p.code === 'B' && c.code === 'C') note -= 2
        }
    })
    return note
}

export function planifierSemaine(
    lundi: Date,
    cours: Cours[],
    taches: Tache[],
    r: Reglages = REGLAGES_PAR_DEFAUT,
    maintenant: Date = new Date(),
): Creneau[] {
    const occ = absences(cours, taches, r)
    const jours: Date[] = []
    for (let i = 0; i < 7; i++) {
        const jour = new Date(lundi)
        jour.setDate(lundi.getDate() + i)
        jours.push(jour)
    }
    const seances = PROGRAMME.filter((b) => b.lieu === 'salle' || r.seanceMaison).map((b) => seanceParCode(b.code))
    // options[s][j] : meilleur créneau de la séance s le jour j (chaque séance a sa durée).
    const options = seances.map((s) => jours.map((j) => meilleurCreneau(j, occ, r, maintenant, s.lieu, dureeDe(s, r.duree))))

    let meilleur: Choix[] = []
    let meilleureCle = -Infinity
    const pris = new Set<number>()
    const courant: Choix[] = []
    // On cherche d'abord le plus de séances possible, puis le meilleur planning.
    const explorer = (k: number) => {
        if (k === seances.length) {
            const cle = courant.length * 1000 + noter(courant)
            if (cle > meilleureCle) {
                meilleureCle = cle
                meilleur = [...courant]
            }
            return
        }
        for (let j = 0; j < 7; j++) {
            const o = options[k][j]
            if (!o || pris.has(j)) continue
            pris.add(j)
            courant.push({ jour: jours[j], code: seances[k].code, option: o })
            explorer(k + 1)
            courant.pop()
            pris.delete(j)
        }
        explorer(k + 1) // séance non placée cette semaine
    }
    explorer(0)

    return meilleur
        .sort((a, b) => a.option.depart - b.option.depart)
        .map((c) => versCreneau(seanceParCode(c.code), c.option.depart, r))
}

const hm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function titreSeance(s: SeanceProgramme): string {
    return `${s.lieu === 'maison' ? 'Maison' : 'Salle'} · Séance ${s.code} — ${s.titre.replace(/^Maison : /, '')}`
}

export function descriptionSeance(c: Creneau): string {
    const s = c.seance
    const exos = s.blocs.flatMap((b) => b.exercices.map((e) => `• ${e.nom} — ${e.series} × ${e.reps}`))
    const entete =
        s.lieu === 'maison'
            ? `Séance à la maison ${hm(c.debut)}–${hm(c.fin)} (élastiques et poids du corps)`
            : `Départ ${hm(c.depart)} · séance ${hm(c.debut)}–${hm(c.fin)} au Basic-Fit Atlantis · retour vers ${hm(c.retour)}`
    return [entete, `Niveau ${s.niveau} · ${s.nom}`, '', ...exos, '', `Détail et suivi dans l’onglet Muscu — ${MARQUEUR} ${s.code}`].join('\n')
}

// Retrouve la séance (A/B/C/D) d'une tâche créée automatiquement.
export function codeDeTache(t: Tache): CodeSeance | null {
    const m = (t.description || '').match(/#sport-auto ([ABCD])/)
    if (m) return m[1] as CodeSeance
    const m2 = t.titre.match(/Séance ([ABCD])/)
    return m2 ? (m2[1] as CodeSeance) : null
}

function versCreneau(seance: SeanceProgramme, depart: number, r: Reglages): Creneau {
    const trajet = seance.lieu === 'salle' ? r.trajetSalle : 0
    const debut = depart + trajet * MIN
    const fin = debut + dureeDe(seance, r.duree) * MIN
    return { seance, depart: new Date(depart), debut: new Date(debut), fin: new Date(fin), retour: new Date(fin + trajet * MIN) }
}

// Pour déplacer une séance : le meilleur créneau possible de chaque jour de la semaine
// (en respectant les cours, les trajets et les autres tâches, sauf la séance déplacée).
export function creneauxPourDeplacer(
    seance: SeanceProgramme,
    lundi: Date,
    cours: Cours[],
    autresTaches: Tache[],
    r: Reglages,
    maintenant: Date = new Date(),
): { jour: Date; creneau: Creneau | null }[] {
    const occ = absences(cours, autresTaches, r)
    const res: { jour: Date; creneau: Creneau | null }[] = []
    for (let i = 0; i < 7; i++) {
        const jour = new Date(lundi)
        jour.setDate(lundi.getDate() + i)
        const fin = new Date(jour)
        fin.setHours(23, 59, 59, 999)
        if (fin.getTime() < maintenant.getTime()) continue
        const o = meilleurCreneau(jour, occ, r, maintenant, seance.lieu, dureeDe(seance, r.duree))
        res.push({ jour, creneau: o ? versCreneau(seance, o.depart, r) : null })
    }
    return res
}

// Séance placée à la main : l'heure donnée est le début de la séance.
export function creneauManuel(seance: SeanceProgramme, debutSeance: Date, r: Reglages): Creneau {
    const trajet = seance.lieu === 'salle' ? r.trajetSalle : 0
    return versCreneau(seance, debutSeance.getTime() - trajet * MIN, r)
}
