// Heures d'étude placées automatiquement, avec un programme structuré par échéance.
// Daniel révise le soir (20 h 30 – 23 h 30). On ne sort de ce créneau que si un DS est très proche
// et qu'une étape n'est pas encore validée. Priorités : DS, oraux, projets, TP, puis les TD (révisions courtes).
import type { Cours, Tache } from './api'
import { cleDuType, nomModule } from './coursType'
import { MARQUEUR as MARQUEUR_SPORT, lireReglages } from './sport'

export const MARQUEUR_ETUDE = '#etude-auto'
export const MARQUEUR_ECHEANCE = '#echeance'
const MIN = 60000
const JOUR = 24 * 60 * MIN

export type ReglagesEtudes = {
    debut: string // début du créneau de révision du soir
    fin: string // fin du créneau du soir
    maxJourCours: number // minutes max un jour de cours
    maxJourLibre: number // minutes max un jour sans cours
    dureeTD: number // minutes par révision de TD (15 à 30)
    urgenceJours: number // « DS très proche » : on peut sortir du créneau du soir
    midiOraux: boolean // oraux : utiliser aussi la pause de midi en semaine
}

export const REGLAGES_ETUDES: ReglagesEtudes = {
    debut: '20:30',
    fin: '23:30',
    maxJourCours: 90,
    maxJourLibre: 135,
    dureeTD: 20,
    urgenceJours: 2,
    midiOraux: false,
}

export function lireReglagesEtudes(): ReglagesEtudes {
    try {
        const brut = localStorage.getItem('etudes.reglages2')
        if (brut) return { ...REGLAGES_ETUDES, ...JSON.parse(brut) }
    } catch {
        // stockage indisponible
    }
    return REGLAGES_ETUDES
}

export function enregistrerReglagesEtudes(r: ReglagesEtudes): void {
    try {
        localStorage.setItem('etudes.reglages2', JSON.stringify(r))
    } catch {
        // stockage indisponible
    }
}

export type TypeEcheance = 'ds' | 'soutenance' | 'projet' | 'tp' | 'td'

export const TYPES_ECHEANCE: Record<TypeEcheance, { libelle: string; court: string; emoji: string; priorite: number; couleur: string }> = {
    ds: { libelle: 'DS / contrôle', court: 'DS', emoji: '📝', priorite: 1, couleur: '#38bdf8' },
    soutenance: { libelle: 'Oral / soutenance', court: 'ORAL', emoji: '🎤', priorite: 2, couleur: '#38bdf8' },
    projet: { libelle: 'Projet / rendu', court: 'PROJET', emoji: '📦', priorite: 3, couleur: '#f59e0b' },
    tp: { libelle: 'TP', court: 'TP', emoji: '🧪', priorite: 4, couleur: '#06b6d4' },
    td: { libelle: 'TD', court: 'TD', emoji: '✏️', priorite: 5, couleur: '#4ade80' },
}

export type EtapeProgramme = { nom: string; duree: number; avant: number; consignes: string[] }

// Programme de préparation : chaque étape est un créneau, à valider (marquer « fait ») une fois terminée.
// `avant` = jour idéal, en jours avant l'échéance (pour les TD : après le TD).
export function programme(type: TypeEcheance, r: ReglagesEtudes): EtapeProgramme[] {
    switch (type) {
        case 'ds':
            return [
                { nom: 'Réviser', duree: 45, avant: 5, consignes: ['Relis le cours (CM) et tes notes du module', 'Fais une fiche d’une page : formules, définitions, méthodes types', 'Note ce qui n’est pas clair pour l’étape « Appliquer »'] },
                { nom: 'Appliquer', duree: 45, avant: 3, consignes: ['Refais 2 ou 3 exercices de TD sans regarder la correction', 'Corrige-toi et note chaque erreur avec la bonne méthode', 'Complète ta fiche avec les pièges rencontrés'] },
                { nom: 'Valider', duree: 45, avant: 1, consignes: ['Fais un sujet type ou une annale en temps limité (sinon des exercices mélangés)', 'Corrige-toi : moins de 70 % de juste ? ajoute un bloc « Appliquer »', 'Relis ta fiche une dernière fois'] },
            ]
        case 'soutenance':
            return [
                { nom: 'Structurer', duree: 60, avant: 8, consignes: ['Écris le plan : intro, 2 ou 3 parties, conclusion', 'Liste les messages clés et les chiffres à retenir', 'Repère les questions probables du jury'] },
                { nom: 'Préparer les supports', duree: 60, avant: 6, consignes: ['Fais ou termine les diapos (une idée par diapo)', 'Prépare tes notes d’appui', 'Vérifie le temps prévu pour chaque partie'] },
                { nom: 'Répéter', duree: 60, avant: 3, consignes: ['Répète à voix haute en te chronométrant', 'Enregistre-toi et réécoute', 'Raccourcis ce qui est trop long ou pas clair'] },
                { nom: 'Répétition finale', duree: 60, avant: 1, consignes: ['Fais une répétition complète comme le jour J', 'Prépare tes réponses aux questions probables', 'Vérifie le matériel : fichier, clé USB, impression'] },
            ]
        case 'projet':
            return [
                { nom: 'Planifier', duree: 45, avant: 9, consignes: ['Liste ce qu’il reste à faire et découpe en petites tâches', 'Décide ce que tu termines à chaque séance'] },
                { nom: 'Avancer', duree: 45, avant: 6, consignes: ['Avance sur la tâche la plus importante', 'Note où tu t’arrêtes pour reprendre vite'] },
                { nom: 'Avancer', duree: 45, avant: 3, consignes: ['Termine les parties principales', 'Note ce qui manque encore'] },
                { nom: 'Relire et rendre', duree: 45, avant: 1, consignes: ['Relis tout et vérifie les consignes du rendu', 'Prépare le fichier final ou l’impression'] },
            ]
        case 'tp':
            return [{ nom: 'Préparer', duree: 30, avant: 1, consignes: ['Lis l’énoncé du TP', 'Revois la théorie et les formules utiles', 'Prépare les tableaux de mesures et les questions préparatoires'] }]
        case 'td':
            return [
                {
                    nom: 'Préparer',
                    duree: Math.min(30, Math.max(15, r.dureeTD)),
                    avant: 1,
                    consignes: ['Relis le cours lié au TD de demain', 'Refais un exercice du TD précédent de cette matière', 'Lis l’énoncé du TD si tu l’as et note tes questions'],
                },
            ]
    }
}

export type EtatEtape = { statut: 'fait' | 'prevu' | 'manque'; debut?: Date }

export type Echeance = {
    cle: string
    type: TypeEcheance
    matiere: string
    date: Date // date du DS / oral / rendu… (pour un TD : fin du TD)
    source: 'edt' | 'tache' | 'td'
    etapes: EtatEtape[]
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
    return null
}

export function matiereDeTache(t: Tache): string {
    return (
        t.titre
            .replace(/^(📝|🎤|📦|🧪|✏️)\s*/u, '')
            .replace(/^(DS|Contrôle|Soutenance|Oral|Projet|Rendu|TP|TD)\s*[·:-]?\s*(de |d’|d')?/i, '')
            .trim() || t.titre
    )
}

function hash(s: string): string {
    let h = 0
    for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0
    return (h >>> 0).toString(36)
}

/** Toutes les échéances de la période, avec l'état de chaque étape de leur programme. */
export function echeances(cours: Cours[], taches: Tache[], maintenant: Date, jusquA: Date, r: ReglagesEtudes = REGLAGES_ETUDES): Echeance[] {
    // Blocs déjà créés : `#etude-auto <clé> e<n>`
    const blocs = new Map<string, Tache[]>()
    for (const t of taches) {
        const m = (t.description || '').match(/#etude-auto (\S+) e(\d+)/)
        if (!m || t.statut === 'annule') continue
        const k = `${m[1]}#${m[2]}`
        blocs.set(k, [...(blocs.get(k) || []), t])
    }
    const etats = (cle: string, type: TypeEcheance): EtatEtape[] =>
        programme(type, r).map((_, i) => {
            const liste = blocs.get(`${cle}#${i + 1}`) || []
            if (liste.some((t) => t.statut === 'fait')) return { statut: 'fait' }
            const avenir = liste.find((t) => t.date_debut && new Date(t.date_fin || t.date_debut) > maintenant)
            return avenir ? { statut: 'prevu', debut: new Date(avenir.date_debut!) } : { statut: 'manque' }
        })

    const liste: Echeance[] = []
    const tdParJour = new Map<string, { matiere: string; date: Date }>()
    const dansFenetre = (d: Date) => d.getTime() > maintenant.getTime() && d.getTime() <= jusquA.getTime()

    for (const c of cours) {
        const k = cleDuType(c.type)
        const matiere = nomModule(c.titre)
        if (k === 'ds') {
            const date = new Date(c.date_debut)
            if (!dansFenetre(date)) continue
            const type: TypeEcheance = /soutenance|oral/i.test(c.type || '') ? 'soutenance' : 'ds'
            const cle = `c${c.id}`.slice(0, 32)
            liste.push({ cle, type, matiere, date, source: 'edt', etapes: etats(cle, type) })
        } else if (k === 'tp') {
            const date = new Date(c.date_debut)
            if (!dansFenetre(date)) continue
            const cle = `p${hash(c.id)}`
            liste.push({ cle, type: 'tp', matiere, date, source: 'edt', etapes: etats(cle, 'tp') })
        } else if (k === 'td') {
            // Révision courte la veille de chaque TD (« les TD du lendemain »).
            // Deux TD de la même matière le même jour = une seule révision, avant le premier.
            const debut = new Date(c.date_debut)
            if (!dansFenetre(debut)) continue
            if (/anglais|communication/i.test(matiere)) continue
            const id = `${matiere}|${debut.toDateString()}`
            const deja = tdParJour.get(id)
            if (!deja || debut < deja.date) tdParJour.set(id, { matiere, date: debut })
        }
    }
    for (const [id, td] of tdParJour) {
        const cle = `d${hash(id)}`
        liste.push({ cle, type: 'td', matiere: td.matiere, date: td.date, source: 'td', etapes: etats(cle, 'td') })
    }

    for (const t of taches) {
        if (!t.date_debut) continue
        const date = new Date(t.date_debut)
        const type = typeDeTache(t)
        if (!type || !dansFenetre(date) || t.statut === 'fait' || t.statut === 'annule') continue
        const cle = `t${t.id}`.slice(0, 32)
        liste.push({ cle, type, matiere: matiereDeTache(t), date, source: 'tache', etapes: etats(cle, type) })
    }

    return liste.sort((a, b) => TYPES_ECHEANCE[a.type].priorite - TYPES_ECHEANCE[b.type].priorite || a.date.getTime() - b.date.getTime())
}

type Intervalle = { debut: number; fin: number }
type Mode = 'soir' | 'midi' | 'urgence'

function aHeure(jour: Date, hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number)
    const d = new Date(jour)
    d.setHours(h || 0, m || 0, 0, 0)
    return d.getTime()
}

const memeJour = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const debutJour = (t: number) => {
    const d = new Date(t)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
}

// Occupations d'une journée : cours (+ trajet avant le premier et après le dernier), tâches, repas.
function occupations(jour: Date, cours: Cours[], taches: Tache[]): { occ: Intervalle[]; aCours: boolean } {
    const trajet = lireReglages().trajetIut * MIN
    const duJour = cours.filter((c) => memeJour(new Date(c.date_debut), jour))
    const occ: Intervalle[] = []
    if (duJour.length) {
        const premier = Math.min(...duJour.map((c) => new Date(c.date_debut).getTime()))
        const dernier = Math.max(...duJour.map((c) => new Date(c.date_fin).getTime()))
        occ.push({ debut: premier - trajet, fin: premier })
        occ.push({ debut: dernier, fin: dernier + trajet })
        for (const c of duJour) occ.push({ debut: new Date(c.date_debut).getTime() - 10 * MIN, fin: new Date(c.date_fin).getTime() + 10 * MIN })
    }
    for (const t of taches) {
        if (!t.date_debut || t.toute_la_journee || t.statut === 'annule') continue
        const d = new Date(t.date_debut).getTime()
        const f = t.date_fin ? new Date(t.date_fin).getTime() : d + 60 * MIN
        if (f < aHeure(jour, '00:00') || d > aHeure(jour, '23:59')) continue
        const marge = (t.description || '').includes(MARQUEUR_ETUDE) ? 5 : 15
        occ.push({ debut: d - marge * MIN, fin: f + marge * MIN })
    }
    occ.push({ debut: aHeure(jour, '12:00'), fin: aHeure(jour, '12:45') }) // déjeuner
    occ.push({ debut: aHeure(jour, '19:30'), fin: aHeure(jour, '20:15') }) // dîner
    return { occ, aCours: duJour.length > 0 }
}

function fenetres(jour: Date, mode: Mode, r: ReglagesEtudes): Intervalle[] {
    const weekend = jour.getDay() === 0 || jour.getDay() === 6
    if (mode === 'soir') return [{ debut: aHeure(jour, r.debut), fin: aHeure(jour, r.fin) }]
    if (mode === 'midi') return weekend ? [] : [{ debut: aHeure(jour, '12:45'), fin: aHeure(jour, '13:45') }]
    return weekend
        ? [{ debut: aHeure(jour, '09:30'), fin: aHeure(jour, '19:30') }]
        : [{ debut: aHeure(jour, '08:00'), fin: aHeure(jour, '20:15') }]
}

export type BlocEtude = { echeance: Echeance; etape: number; debut: Date; fin: Date; mode: Mode }

/** Place les étapes à faire dans la semaine qui commence `lundi`. */
export function planifierEtudes(
    lundi: Date,
    cours: Cours[],
    taches: Tache[],
    toutes: Echeance[],
    r: ReglagesEtudes = REGLAGES_ETUDES,
    maintenant: Date = new Date(),
): { blocs: BlocEtude[]; restants: { echeance: Echeance; etape: number }[] } {
    const finSemaine = lundi.getTime() + 7 * JOUR
    const jours = Array.from({ length: 7 }, (_, i) => {
        const jour = new Date(lundi)
        jour.setDate(lundi.getDate() + i)
        return { jour, ...occupations(jour, cours, taches), utilise: 0 }
    })
    // Minutes d'étude déjà prévues chaque jour (blocs gardés).
    for (const t of taches) {
        if (!t.description?.includes(MARQUEUR_ETUDE) || !t.date_debut || !t.date_fin || t.statut === 'annule') continue
        const j = jours.find((x) => memeJour(x.jour, new Date(t.date_debut!)))
        if (j) j.utilise += (new Date(t.date_fin).getTime() - new Date(t.date_debut).getTime()) / MIN
    }
    const blocs: BlocEtude[] = []
    const restants: { echeance: Echeance; etape: number }[] = []

    function chercher(duree: number, ouverture: number, limite: number, ideal: number, modes: Mode[], sansMax = false, auPlusTot = false) {
        let meilleur: { jour: number; debut: number; score: number; mode: Mode } | null = null
        for (const [ij, j] of jours.entries()) {
            const max = j.aCours ? r.maxJourCours : r.maxJourLibre
            if (!sansMax && j.utilise + duree > max) continue
            for (const mode of modes) {
                for (const f of fenetres(j.jour, mode, r)) {
                    const premier = Math.max(f.debut, ouverture)
                    const dernier = Math.min(f.fin, limite)
                    const pas = 5 * MIN
                    for (let t = Math.ceil(premier / pas) * pas; t + duree * MIN <= dernier; t += pas) {
                        if (j.occ.some((o) => t < o.fin && t + duree * MIN > o.debut)) continue
                        const ecart = Math.abs(debutJour(t) - debutJour(ideal)) / JOUR
                        const tard = (t - f.debut) / (60 * MIN) // plus tôt dans le créneau = mieux
                        const bonus = mode === 'soir' ? 10 : mode === 'midi' ? 6 : 0
                        const score = auPlusTot ? -t : bonus - 3 * ecart - 0.4 * tard
                        if (!meilleur || score > meilleur.score) meilleur = { jour: ij, debut: t, score, mode }
                    }
                }
            }
        }
        return meilleur
    }

    // Place les étapes d'une échéance. `secours` : DS très proche dont tout ne tient pas le soir →
    // on prend les premiers créneaux libres (journée comprise), sans limite par jour.
    function placer(e: Echeance, urgent: boolean, secours: boolean): { nouveaux: BlocEtude[]; manquants: number[] } {
        const prog = programme(e.type, r)
        const nouveaux: BlocEtude[] = []
        const manquants: number[] = []
        let precedent: number | null = null // fin de l'étape précédente (prévue ou placée)
        prog.forEach((etape, i) => {
            const etat = e.etapes[i]
            if (etat.statut === 'fait') return
            if (etat.statut === 'prevu') {
                precedent = etat.debut ? etat.debut.getTime() + etape.duree * MIN : precedent
                return
            }
            let ouverture: number
            let limite: number
            let ideal: number
            if (e.type === 'td') {
                // La veille au soir (au plus tôt l'avant-veille), et fini 1 h avant le TD.
                ouverture = debutJour(e.date.getTime()) - 2 * JOUR
                limite = e.date.getTime() - 60 * MIN
                ideal = e.date.getTime() - JOUR
            } else {
                limite = e.date.getTime() - 60 * MIN
                ideal = e.date.getTime() - etape.avant * JOUR
                ouverture = e.date.getTime() - (prog[0].avant + 2) * JOUR
                // Une étape par jour, dans l'ordre (en urgence : le même jour, 10 min après).
                if (precedent !== null) ouverture = Math.max(ouverture, urgent ? precedent + 10 * MIN : debutJour(precedent) + JOUR)
            }
            ouverture = Math.max(ouverture, maintenant.getTime() + 30 * MIN)
            // Pas cette semaine : le jour idéal est après dimanche (sauf urgence).
            if (!urgent && debutJour(ideal) >= finSemaine) return
            if (limite <= ouverture) {
                manquants.push(i)
                return
            }
            const modes: Mode[] = e.type === 'soutenance' && r.midiOraux ? ['soir', 'midi'] : ['soir']
            let choix = secours
                ? chercher(etape.duree, ouverture, limite, ideal, ['urgence', 'soir'], true, true)
                : chercher(etape.duree, ouverture, limite, ideal, modes)
            // DS très proche et étape pas validée : on peut dépasser le maximum du soir.
            if (!choix && urgent && !secours) choix = chercher(etape.duree, ouverture, limite, ideal, modes, true)
            if (!choix) {
                if (e.type !== 'td' || limite < finSemaine) manquants.push(i)
                return
            }
            const j = jours[choix.jour]
            const fin = choix.debut + etape.duree * MIN
            j.occ.push({ debut: choix.debut - 5 * MIN, fin: fin + 5 * MIN })
            j.utilise += etape.duree
            const soir = choix.mode === 'soir' && !(secours && new Date(choix.debut).getHours() < 20)
            nouveaux.push({ echeance: e, etape: i, debut: new Date(choix.debut), fin: new Date(fin), mode: soir ? 'soir' : choix.mode })
            precedent = fin
        })
        return { nouveaux, manquants }
    }

    for (const e of toutes) {
        const urgent = e.type !== 'td' && e.type !== 'tp' && e.date.getTime() - maintenant.getTime() <= r.urgenceJours * JOUR
        const sauvegarde = jours.map((j) => ({ occ: [...j.occ], utilise: j.utilise }))
        let res = placer(e, urgent, false)
        if (urgent && res.manquants.length) {
            // Tout ne tient pas le soir : on recommence en prenant aussi la journée.
            const premier = res
            jours.forEach((j, i) => {
                j.occ = [...sauvegarde[i].occ]
                j.utilise = sauvegarde[i].utilise
            })
            res = placer(e, urgent, true)
            if (res.manquants.length > premier.manquants.length) {
                jours.forEach((j, i) => {
                    j.occ = [...sauvegarde[i].occ]
                    j.utilise = sauvegarde[i].utilise
                })
                res = placer(e, urgent, false)
            }
        }
        blocs.push(...res.nouveaux)
        for (const i of res.manquants) restants.push({ echeance: e, etape: i })
    }
    return { blocs: blocs.sort((a, b) => a.debut.getTime() - b.debut.getTime()), restants }
}

const dateLongue = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export function titreBloc(b: BlocEtude, r: ReglagesEtudes): string {
    const e = b.echeance
    const t = TYPES_ECHEANCE[e.type]
    const prog = programme(e.type, r)
    const etape = prog[b.etape]
    if (e.type === 'td') return `${t.emoji} Préparer le TD de demain · ${e.matiere}`
    if (e.type === 'tp') return `${t.emoji} Préparer le TP · ${e.matiere}`
    return `${t.emoji} ${t.court} ${e.matiere} · ${b.etape + 1}/${prog.length} ${etape.nom}`
}

export function descriptionBloc(b: BlocEtude, r: ReglagesEtudes): string {
    const e = b.echeance
    const t = TYPES_ECHEANCE[e.type]
    const prog = programme(e.type, r)
    const etape = prog[b.etape]
    const quoi = e.type === 'td' ? `TD de ${e.matiere}, ${dateLongue.format(e.date)}` : `${t.libelle} ${e.matiere}, ${dateLongue.format(e.date)}`
    return [
        `Étape ${b.etape + 1}/${prog.length} — ${etape.nom} (${etape.duree} min) · ${quoi}`,
        ...etape.consignes.map((c) => `☐ ${c}`),
        prog.length > 1 ? `Programme : ${prog.map((p, i) => `${i + 1} ${p.nom}`).join(' · ')}` : '',
        b.mode === 'urgence' ? '⚡ Hors de ton créneau du soir : le DS est très proche et cette étape n’était pas validée.' : '',
        'Coche la tâche « fait » quand l’étape est terminée : elle compte comme validée.',
        '',
        `${MARQUEUR_ETUDE} ${e.cle} e${b.etape + 1}`,
    ]
        .filter((l, i, a) => l !== '' || a[i - 1] !== '')
        .join('\n')
}

/** Pour la fiche d'un bloc : étape courante, programme et consignes (lus dans la description). */
export function lireBloc(t: Tache): { etape: number; total: number; noms: string[]; consignes: string[]; urgence: boolean } | null {
    const d = t.description || ''
    const m = d.match(/#etude-auto \S+ e(\d+)/)
    if (!m) return null
    const lignes = d.split('\n')
    const prog = lignes.find((l) => l.startsWith('Programme : '))
    const noms = prog ? prog.slice(12).split(' · ').map((s) => s.replace(/^\d+ /, '')) : []
    return {
        etape: Number(m[1]),
        total: Math.max(noms.length, 1),
        noms,
        consignes: lignes.filter((l) => l.startsWith('☐ ')).map((l) => l.slice(2)),
        urgence: d.includes('⚡'),
    }
}
