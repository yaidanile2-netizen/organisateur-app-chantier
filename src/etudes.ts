// Heures d'étude placées automatiquement selon ce qu'il y a à préparer :
// 1) DS / contrôles / soutenances / oraux, 2) projets et TP (préparation, compte rendu), 3) TD.
// Les blocs se placent dans les trous de la semaine (après les trajets, entre deux cours à l'IUT,
// autour du sport et des tâches), sans dépasser le maximum par jour.
import type { Cours, Tache } from './api'
import { cleDuType, nomModule } from './coursType'
import { MARQUEUR as MARQUEUR_SPORT, lireReglages } from './sport'

export const MARQUEUR_ETUDE = '#etude-auto'
export const MARQUEUR_ECHEANCE = '#echeance'
const MIN = 60000
const JOUR = 24 * 60 * MIN

export type ReglagesEtudes = {
    maxJourCours: number // minutes max un jour de cours
    maxJourLibre: number // minutes max un jour sans cours (week-end, vacances)
    bloc: number // durée d'un bloc (min)
    debut: string // pas avant
    fin: string // fini avant
}

export const REGLAGES_ETUDES: ReglagesEtudes = { maxJourCours: 90, maxJourLibre: 135, bloc: 45, debut: '08:00', fin: '21:30' }

export function lireReglagesEtudes(): ReglagesEtudes {
    try {
        const brut = localStorage.getItem('etudes.reglages')
        if (brut) return { ...REGLAGES_ETUDES, ...JSON.parse(brut) }
    } catch {
        // stockage indisponible
    }
    return REGLAGES_ETUDES
}

export function enregistrerReglagesEtudes(r: ReglagesEtudes): void {
    try {
        localStorage.setItem('etudes.reglages', JSON.stringify(r))
    } catch {
        // stockage indisponible
    }
}

export type TypeEcheance = 'ds' | 'soutenance' | 'projet' | 'tp' | 'td'

export const TYPES_ECHEANCE: Record<TypeEcheance, { libelle: string; emoji: string; priorite: 1 | 2 | 3; blocs: number; horizon: number; couleur: string }> = {
    ds: { libelle: 'DS / contrôle', emoji: '📝', priorite: 1, blocs: 3, horizon: 7, couleur: '#38bdf8' },
    soutenance: { libelle: 'Soutenance / oral', emoji: '🎤', priorite: 1, blocs: 4, horizon: 10, couleur: '#38bdf8' },
    projet: { libelle: 'Projet / rendu', emoji: '📦', priorite: 2, blocs: 4, horizon: 10, couleur: '#f59e0b' },
    tp: { libelle: 'TP', emoji: '🧪', priorite: 2, blocs: 1, horizon: 4, couleur: '#06b6d4' },
    td: { libelle: 'TD', emoji: '✏️', priorite: 3, blocs: 1, horizon: 4, couleur: '#4ade80' },
}

export type Echeance = {
    cle: string
    type: TypeEcheance
    matiere: string
    date: Date
    blocs: number // blocs à prévoir au total
    faits: number // blocs déjà dans l'agenda (passés ou à venir)
    source: 'edt' | 'tache' | 'preparation'
}

// Une tâche ajoutée par Daniel (dans l'app ou à la voix) qui ressemble à une échéance.
export function typeDeTache(t: Tache): TypeEcheance | null {
    const d = t.description || ''
    if (d.includes(MARQUEUR_ETUDE) || d.includes(MARQUEUR_SPORT)) return null
    const m = d.match(/#echeance (ds|soutenance|projet|tp|td)\b/)
    if (m) return m[1] as TypeEcheance
    const titre = t.titre.toLowerCase()
    if (/\b(ds|contr[ôo]le|partiel|examen|interro|qcm)\b/.test(titre)) return 'ds'
    if (/soutenance|\boral\b|pr[ée]sentation|exposé/.test(titre)) return 'soutenance'
    if (/projet|\bsa[ée]\b|rendu|rapport|dossier|compte[- ]rendu/.test(titre)) return 'projet'
    if (/\btp\b/.test(titre)) return 'tp'
    if (/\btd\b|exercices?|devoir/.test(titre)) return 'td'
    return null
}

function blocsDemandes(t: Tache): number | null {
    const m = (t.description || '').match(/prepa=(\d{1,2})/)
    return m ? Math.min(20, Math.max(1, Number(m[1]))) : null
}

export function matiereDeTache(t: Tache): string {
    return t.titre.replace(/^(📝|🎤|📦|🧪|✏️)\s*/u, '').replace(/^(DS|Contrôle|Soutenance|Oral|Projet|Rendu|TP|TD)\s*[·:-]\s*/i, '').trim() || t.titre
}

const lundiDe = (d: Date) => {
    const l = new Date(d)
    l.setHours(0, 0, 0, 0)
    l.setDate(l.getDate() - ((l.getDay() + 6) % 7))
    return l
}

/** Toutes les échéances connues sur la période (emploi du temps + tâches), avec ce qui est déjà planifié. */
export function echeances(cours: Cours[], taches: Tache[], maintenant: Date, jusquA: Date): Echeance[] {
    const deja = new Map<string, number>()
    for (const t of taches) {
        const m = (t.description || '').match(/#etude-auto (\S+)/)
        if (m && t.statut !== 'annule') deja.set(m[1], (deja.get(m[1]) || 0) + 1)
    }
    const liste: Echeance[] = []
    const avenir = (d: Date) => d.getTime() > maintenant.getTime() && d.getTime() <= jusquA.getTime()

    // 1) Évaluations de l'emploi du temps
    for (const c of cours) {
        const date = new Date(c.date_debut)
        if (!avenir(date) || cleDuType(c.type) !== 'ds') continue
        const type: TypeEcheance = /soutenance|oral/i.test(c.type || '') ? 'soutenance' : 'ds'
        const cle = `c-${c.id}`.slice(0, 40)
        liste.push({ cle, type, matiere: nomModule(c.titre), date, blocs: TYPES_ECHEANCE[type].blocs, faits: deja.get(cle) || 0, source: 'edt' })
    }

    // 2) Échéances ajoutées par Daniel
    for (const t of taches) {
        if (!t.date_debut) continue
        const date = new Date(t.date_debut)
        const type = typeDeTache(t)
        if (!type || !avenir(date) || t.statut === 'fait' || t.statut === 'annule') continue
        const cle = `t-${t.id}`.slice(0, 40)
        liste.push({ cle, type, matiere: matiereDeTache(t), date, blocs: blocsDemandes(t) ?? TYPES_ECHEANCE[type].blocs, faits: deja.get(cle) || 0, source: 'tache' })
    }

    // 3) Préparation des TP et TD : un bloc par matière et par semaine, avant la première séance.
    const premiers = new Map<string, { type: TypeEcheance; matiere: string; date: Date }>()
    for (const c of cours) {
        const k = cleDuType(c.type)
        if (k !== 'tp' && k !== 'td') continue
        const date = new Date(c.date_debut)
        if (!avenir(date)) continue
        const matiere = nomModule(c.titre)
        if (/anglais|communication/i.test(matiere)) continue // rien à préparer d'habitude
        const id = `${k}-${matiere}-${lundiDe(date).toISOString().slice(0, 10)}`
        const actuel = premiers.get(id)
        if (!actuel || date < actuel.date) premiers.set(id, { type: k, matiere, date })
    }
    for (const [id, p] of premiers) {
        const cle = `p-${hash(id)}`
        liste.push({ cle, type: p.type, matiere: p.matiere, date: p.date, blocs: 1, faits: deja.get(cle) || 0, source: 'preparation' })
    }

    return liste.sort((a, b) => TYPES_ECHEANCE[a.type].priorite - TYPES_ECHEANCE[b.type].priorite || a.date.getTime() - b.date.getTime())
}

function hash(s: string): string {
    let h = 0
    for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0
    return (h >>> 0).toString(36)
}

type Intervalle = { debut: number; fin: number }

function aHeure(jour: Date, hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number)
    const d = new Date(jour)
    d.setHours(h || 0, m || 0, 0, 0)
    return d.getTime()
}

const memeJour = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

// Ce qui occupe une journée : les cours (avec le trajet avant le premier et après le dernier), les tâches, les repas.
function occupations(jour: Date, cours: Cours[], taches: Tache[]): { occ: Intervalle[]; aCours: boolean; iut: Intervalle | null } {
    const trajet = lireReglages().trajetIut * MIN
    const duJour = cours.filter((c) => memeJour(new Date(c.date_debut), jour)).sort((a, b) => a.date_debut.localeCompare(b.date_debut))
    const occ: Intervalle[] = []
    let iut: Intervalle | null = null
    if (duJour.length) {
        const premier = new Date(duJour[0].date_debut).getTime()
        const dernier = Math.max(...duJour.map((c) => new Date(c.date_fin).getTime()))
        iut = { debut: premier, fin: dernier }
        occ.push({ debut: premier - trajet, fin: premier })
        occ.push({ debut: dernier, fin: dernier + trajet })
        for (const c of duJour) occ.push({ debut: new Date(c.date_debut).getTime() - 10 * MIN, fin: new Date(c.date_fin).getTime() + 10 * MIN })
    }
    for (const t of taches) {
        if (!t.date_debut || t.toute_la_journee || t.statut === 'annule') continue
        const d = new Date(t.date_debut).getTime()
        const f = t.date_fin ? new Date(t.date_fin).getTime() : d + 60 * MIN
        occ.push({ debut: d - 15 * MIN, fin: f + 15 * MIN })
    }
    occ.push({ debut: aHeure(jour, '12:15'), fin: aHeure(jour, '13:00') }) // déjeuner
    occ.push({ debut: aHeure(jour, '19:30'), fin: aHeure(jour, '20:15') }) // dîner
    return { occ, aCours: duJour.length > 0, iut }
}

function scoreHoraire(debut: Date, aIut: boolean): number {
    const h = debut.getHours() + debut.getMinutes() / 60
    const weekend = debut.getDay() === 0 || debut.getDay() === 6
    if (aIut) return 7 // entre deux cours, à la BU
    if (weekend) return h >= 9.5 && h < 12 ? 10 : h >= 14 && h < 18 ? 9 : 6
    if (h >= 17 && h < 19.5) return 10
    if (h >= 20.25 && h < 21.5) return 8
    return 5
}

export type BlocEtude = { echeance: Echeance; debut: Date; fin: Date; aIut: boolean }

/** Place les blocs d'étude de la semaine qui commence `lundi`. */
export function planifierEtudes(
    lundi: Date,
    cours: Cours[],
    taches: Tache[],
    toutes: Echeance[],
    r: ReglagesEtudes = REGLAGES_ETUDES,
    maintenant: Date = new Date(),
): { blocs: BlocEtude[]; restants: { echeance: Echeance; manque: number }[] } {
    const dimanche = new Date(lundi.getTime() + 7 * JOUR - 1)
    const bloc = r.bloc * MIN
    const jours = Array.from({ length: 7 }, (_, i) => {
        const jour = new Date(lundi)
        jour.setDate(lundi.getDate() + i)
        return { jour, ...occupations(jour, cours, taches), utilise: 0 }
    })
    const blocs: BlocEtude[] = []
    const restants: { echeance: Echeance; manque: number }[] = []

    for (const e of toutes) {
        const reste = e.blocs - e.faits
        if (reste <= 0) continue
        const ouverture = Math.max(maintenant.getTime() + 30 * MIN, e.date.getTime() - TYPES_ECHEANCE[e.type].horizon * JOUR)
        const limite = e.date.getTime() - 60 * MIN // fini au moins 1 h avant
        if (limite <= ouverture) continue
        // Part de ce qui reste à placer dans cette semaine.
        const debutSem = Math.max(ouverture, lundi.getTime())
        const finSem = Math.min(limite, dimanche.getTime())
        if (finSem <= debutSem) continue
        const part = Math.min(reste, Math.ceil((reste * (finSem - debutSem)) / (limite - ouverture)))
        const joursUtilises = new Set<number>()
        let places = 0
        for (let n = 0; n < part; n++) {
            let meilleur: { jour: number; debut: number; score: number; aIut: boolean } | null = null
            for (const [ij, j] of jours.entries()) {
                const max = (j.aCours ? r.maxJourCours : r.maxJourLibre) * MIN
                if (j.utilise + bloc > max) continue
                const weekend = j.jour.getDay() === 0 || j.jour.getDay() === 6
                const premier = Math.max(aHeure(j.jour, weekend ? '09:00' : r.debut), ouverture)
                const dernier = Math.min(aHeure(j.jour, r.fin), limite)
                for (let t = premier - (premier % (15 * MIN)); t + bloc <= dernier; t += 15 * MIN) {
                    if (t < premier) continue
                    if (j.occ.some((o) => t < o.fin && t + bloc > o.debut)) continue
                    const aIut = !!j.iut && t >= j.iut.debut && t + bloc <= j.iut.fin
                    let score = scoreHoraire(new Date(t), aIut)
                    if (!joursUtilises.has(ij)) score += 6 // étaler sur plusieurs jours
                    score += Math.max(0, 3 - (limite - t) / JOUR) * 0.5 // un peu plus près de l'échéance
                    if (!meilleur || score > meilleur.score) meilleur = { jour: ij, debut: t, score, aIut }
                }
            }
            if (!meilleur) break
            const m = meilleur
            const j = jours[m.jour]
            j.occ.push({ debut: m.debut - 10 * MIN, fin: m.debut + bloc + 10 * MIN })
            j.utilise += bloc
            joursUtilises.add(m.jour)
            blocs.push({ echeance: e, debut: new Date(m.debut), fin: new Date(m.debut + bloc), aIut: m.aIut })
            places++
        }
        if (places < part) restants.push({ echeance: e, manque: part - places })
    }
    return { blocs: blocs.sort((a, b) => a.debut.getTime() - b.debut.getTime()), restants }
}

export function titreBloc(e: Echeance): string {
    const t = TYPES_ECHEANCE[e.type]
    if (e.source === 'preparation') return `${t.emoji} Préparer le ${e.type.toUpperCase()} · ${e.matiere}`
    return `${t.emoji} Réviser ${e.type === 'ds' ? 'le DS' : e.type === 'soutenance' ? 'la soutenance' : e.type === 'projet' ? 'le projet' : `le ${e.type.toUpperCase()}`} · ${e.matiere}`
}

const dateLongue = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export function descriptionBloc(b: BlocEtude): string {
    const t = TYPES_ECHEANCE[b.echeance.type]
    return [
        `${t.libelle} : ${b.echeance.matiere}, ${dateLongue.format(b.echeance.date)}.`,
        b.aIut ? 'Entre deux cours : à la BU ou en salle libre.' : 'À la maison.',
        '',
        `${MARQUEUR_ETUDE} ${b.echeance.cle}`,
    ].join('\n')
}
