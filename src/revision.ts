// Blocs d'étude de l'agenda (#etude-auto) → éléments du « programme de révision » de l'onglet Cours.
import type { Tache } from './api'
import { MARQUEUR_ETUDE } from './etudes'
import type { ItemRevision } from './evenements'

const heure = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

function memeJour(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function estBlocEtude(t: Tache): boolean {
    return (t.description || '').includes(MARQUEUR_ETUDE)
}

/** Titre d'un bloc → matière, étape et type (voir titreBloc dans etudes.ts). */
export function itemRevision(t: Tache, maintenant: Date = new Date()): ItemRevision | null {
    if (!estBlocEtude(t) || !t.date_debut) return null
    const debut = new Date(t.date_debut)
    const titre = t.titre.replace(/^\S+\s+/u, '').trim()
    let matiere = titre
    let etape = 'Réviser'
    let type = 'ds'
    let m = titre.match(/^Préparer le (TD|TP)(?: de demain)?\s*·\s*(.+)$/i)
    if (m) {
        type = m[1].toLowerCase()
        matiere = m[2]
        etape = 'Préparer'
    } else if ((m = titre.match(/^(DS|ORAL|PROJET|TP|TD)\s+(.+?)\s*·\s*\d+\/\d+\s+(.+)$/i))) {
        type = { ds: 'ds', oral: 'soutenance', projet: 'projet', tp: 'tp', td: 'td' }[m[1].toLowerCase()] ?? 'ds'
        matiere = m[2]
        etape = m[3]
    }
    const demain = new Date(maintenant)
    demain.setDate(demain.getDate() + 1)
    const jour = memeJour(debut, maintenant) ? 'Auj.' : memeJour(debut, demain) ? 'Demain' : jourCourt.format(debut)
    const ligne = (t.description || '').split('\n')[0] || ''
    const ech = ligne.match(/,\s*([^\s,]+ \d+ [^\s,]+)/)
    const COURT: Record<string, string> = { ds: 'DS', soutenance: 'Oral', projet: 'Rendu', tp: 'TP', td: 'TD' }
    return {
        quand: `${jour} ${heure(debut)}`,
        titre,
        matiere: matiere.trim(),
        etape,
        type,
        fait: t.statut === 'fait',
        echeance: ech ? `${COURT[type] ?? ''} ${ech[1]}`.trim() : undefined,
    }
}

/** Les révisions d'aujourd'hui ; s'il n'y en a pas, les prochaines (3 jours). */
export function programmeRevision(taches: Tache[], maintenant: Date = new Date()): ItemRevision[] {
    const blocs = taches
        .filter((t) => estBlocEtude(t) && t.date_debut && t.statut !== 'annule')
        .sort((a, b) => (a.date_debut || '').localeCompare(b.date_debut || ''))
    const auj = blocs.filter((t) => memeJour(new Date(t.date_debut!), maintenant))
    const liste = auj.length ? auj : blocs.filter((t) => new Date(t.date_debut!) > maintenant).slice(0, 3)
    return liste.map((t) => itemRevision(t, maintenant)).filter((x): x is ItemRevision => x !== null)
}
