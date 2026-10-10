import { useState } from 'react'
import type { Categorie, ModificationTache, NouvelleTache, Priorite, Statut, Tache } from './api'

type Props = {
    categories: Categorie[]
    tacheExistante: Tache | null
    dateParDefaut: Date
    onFermer: () => void
    onEnregistrer: (data: NouvelleTache | ModificationTache) => Promise<void>
    onSupprimer: (id: string) => Promise<void>
}

function versDatetimeLocal(iso: string | null, dateParDefaut: Date): string {
    const d = iso ? new Date(iso) : new Date(dateParDefaut)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function versISO(datetimeLocal: string): string {
    return new Date(datetimeLocal).toISOString()
}

export default function TaskForm({
    categories,
    tacheExistante,
    dateParDefaut,
    onFermer,
    onEnregistrer,
    onSupprimer,
}: Props) {
    const heureDefautDebut = new Date(dateParDefaut)
    heureDefautDebut.setHours(9, 0, 0, 0)
    const heureDefautFin = new Date(dateParDefaut)
    heureDefautFin.setHours(10, 0, 0, 0)

    const [titre, setTitre] = useState(tacheExistante?.titre ?? '')
    const [description, setDescription] = useState(tacheExistante?.description ?? '')
    const [categorieId, setCategorieId] = useState<string>(
        tacheExistante?.categorie_id ? String(tacheExistante.categorie_id) : ''
    )
    const [dateDebut, setDateDebut] = useState(
        versDatetimeLocal(tacheExistante?.date_debut ?? null, heureDefautDebut)
    )
    const [dateFin, setDateFin] = useState(
        versDatetimeLocal(tacheExistante?.date_fin ?? null, heureDefautFin)
    )
    const [touteLaJournee, setTouteLaJournee] = useState(tacheExistante?.toute_la_journee ?? false)
    const [statut, setStatut] = useState<Statut>(tacheExistante?.statut ?? 'a_faire')
    const [priorite, setPriorite] = useState<Priorite>(tacheExistante?.priorite ?? 'normale')
    const [enCours, setEnCours] = useState(false)
    const [erreur, setErreur] = useState<string | null>(null)

    const modeEdition = tacheExistante !== null
    const modifiable = tacheExistante ? tacheExistante.modifiable : true

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!titre.trim()) {
            setErreur('Le titre est obligatoire.')
            return
        }
        setErreur(null)
        setEnCours(true)
        try {
            const base: NouvelleTache = {
                titre: titre.trim(),
                description: description.trim() || undefined,
                categorie_id: categorieId ? Number(categorieId) : null,
                date_debut: versISO(dateDebut),
                date_fin: versISO(dateFin),
                toute_la_journee: touteLaJournee,
                statut,
                priorite,
            }
            if (modeEdition && tacheExistante) {
                await onEnregistrer({ ...base, id: tacheExistante.id })
            } else {
                await onEnregistrer(base)
            }
        } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Une erreur est survenue.')
        } finally {
            setEnCours(false)
        }
    }

    async function handleSupprimer() {
        if (!tacheExistante) return
        if (!window.confirm(`Supprimer « ${tacheExistante.titre} » ?`)) return
        setEnCours(true)
        setErreur(null)
        try {
            await onSupprimer(tacheExistante.id)
        } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Une erreur est survenue.')
            setEnCours(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onFermer}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>{modeEdition ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>

                {!modifiable && (
                    <p className="muted modal-warning">
                        Cette tâche vient d'un cours importé et n'est pas modifiable ici.
                    </p>
                )}

                <form onSubmit={handleSubmit} className="task-form">
                    <label>
                        Titre
                        <input
                            type="text"
                            value={titre}
                            onChange={(e) => setTitre(e.target.value)}
                            disabled={!modifiable}
                            autoFocus
                            required
                        />
                    </label>

                    <label>
                        Description
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={!modifiable}
                            rows={2}
                        />
                    </label>

                    <label>
                        Catégorie
                        <select
                            value={categorieId}
                            onChange={(e) => setCategorieId(e.target.value)}
                            disabled={!modifiable}
                        >
                            <option value="">Aucune</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.nom}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="form-row">
                        <label>
                            Début
                            <input
                                type="datetime-local"
                                value={dateDebut}
                                onChange={(e) => setDateDebut(e.target.value)}
                                disabled={!modifiable}
                            />
                        </label>
                        <label>
                            Fin
                            <input
                                type="datetime-local"
                                value={dateFin}
                                onChange={(e) => setDateFin(e.target.value)}
                                disabled={!modifiable}
                            />
                        </label>
                    </div>

                    <label className="checkbox-row">
                        <input
                            type="checkbox"
                            checked={touteLaJournee}
                            onChange={(e) => setTouteLaJournee(e.target.checked)}
                            disabled={!modifiable}
                        />
                        Toute la journée
                    </label>

                    <div className="form-row">
                        <label>
                            Statut
                            <select
                                value={statut}
                                onChange={(e) => setStatut(e.target.value as Statut)}
                                disabled={!modifiable}
                            >
                                <option value="a_faire">À faire</option>
                                <option value="en_cours">En cours</option>
                                <option value="fait">Fait</option>
                                <option value="annule">Annulé</option>
                            </select>
                        </label>
                        <label>
                            Priorité
                            <select
                                value={priorite}
                                onChange={(e) => setPriorite(e.target.value as Priorite)}
                                disabled={!modifiable}
                            >
                                <option value="basse">Basse</option>
                                <option value="normale">Normale</option>
                                <option value="haute">Haute</option>
                            </select>
                        </label>
                    </div>

                    {erreur && <p className="form-error">{erreur}</p>}

                    <div className="modal-actions">
                        {modeEdition && modifiable && (
                            <button
                                type="button"
                                className="btn-danger"
                                onClick={handleSupprimer}
                                disabled={enCours}
                            >
                                Supprimer
                            </button>
                        )}
                        <button type="button" className="btn-secondary" onClick={onFermer} disabled={enCours}>
                            Annuler
                        </button>
                        {modifiable && (
                            <button type="submit" className="btn-primary" disabled={enCours}>
                                {enCours ? 'Enregistrement…' : 'Enregistrer'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}
