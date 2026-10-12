import Repliable from './Repliable'
import { definirOuvert } from './repli'
// Carte « Mon profil » de l'onglet Muscu : sert à calculer les charges de départ conseillées.
import { useState } from 'react'
import { NIVEAUX, mesures, type Niveau, type Profil } from './profil'

const nombre = (v: number, d = 1) => v.toLocaleString('fr-FR', { maximumFractionDigits: d })

type Props = { profil: Profil; aujourdhui: Date; onChange: (p: Profil) => void }

export default function ProfilMuscu({ profil, aujourdhui, onChange }: Props) {
    const [ouvert, setOuvert] = useState(false)
    const [brouillon, setBrouillon] = useState(profil)
    const m = mesures(profil, aujourdhui)

    function valider() {
        const p: Profil = {
            tailleCm: Math.min(230, Math.max(120, Number(brouillon.tailleCm) || profil.tailleCm)),
            poidsKg: Math.min(200, Math.max(35, Number(brouillon.poidsKg) || profil.poidsKg)),
            grasPct: Math.min(45, Math.max(4, Number(brouillon.grasPct) || profil.grasPct)),
            naissance: /^\d{4}-\d{2}$/.test(brouillon.naissance) ? brouillon.naissance : profil.naissance,
            niveau: brouillon.niveau,
        }
        onChange(p)
        setOuvert(false)
    }

    return (
        <Repliable
            cle="muscu.profil"
            className="mu-carte mu-profil"
            style={{ '--c': '#4cc9ff' } as React.CSSProperties}
            h2Class="mu-h2"
            titre="👤 MON PROFIL"
            resume={`${nombre(profil.tailleCm / 100, 2)} m · ${nombre(profil.poidsKg)} kg`}
            entete={
                <button
                    className="mu-mini"
                    onClick={() => {
                        setBrouillon(profil)
                        setOuvert((o) => !o)
                        definirOuvert('muscu.profil', true)
                    }}
                >
                    {ouvert ? 'Fermer' : '✏️ Modifier'}
                </button>
            }
        >

            <div className="mu-profil-tuiles">
                <div>
                    <b>{nombre(profil.tailleCm / 100, 2)} m</b>
                    <span>taille</span>
                </div>
                <div>
                    <b>{nombre(profil.poidsKg)} kg</b>
                    <span>poids</span>
                </div>
                <div>
                    <b>{nombre(profil.grasPct)} %</b>
                    <span>de gras</span>
                </div>
                <div>
                    <b>{m.age} ans</b>
                    <span>{NIVEAUX[profil.niveau].toLowerCase()}</span>
                </div>
            </div>
            <table className="mu-table mu-profil-calculs">
                <tbody>
                    <tr>
                        <td>Masse maigre</td>
                        <td className="mu-droite">
                            <b>≈ {nombre(m.masseMaigre)} kg</b>
                        </td>
                    </tr>
                    <tr>
                        <td>IMC</td>
                        <td className="mu-droite">
                            <b>{nombre(m.imc)}</b> {m.imc < 18.5 ? '· un peu léger' : m.imc < 25 ? '· normal' : '· au-dessus de la normale'}
                        </td>
                    </tr>
                    <tr>
                        <td>Fréquence cardiaque max</td>
                        <td className="mu-droite">
                            <b>≈ {m.fcMax} bpm</b>
                        </td>
                    </tr>
                </tbody>
            </table>
            <p className="mu-gris">
                🎯 Les charges conseillées sur chaque exercice partent de ta masse maigre, de ton âge et de ton niveau. Ce sont des repères pour la 1ʳᵉ séance :
                ensuite, le bilan de séance ajuste tout seul.
            </p>

            {ouvert && (
                <div className="mu-profil-form">
                    <label>
                        Taille (cm)
                        <input type="number" inputMode="numeric" value={brouillon.tailleCm} onChange={(e) => setBrouillon({ ...brouillon, tailleCm: Number(e.target.value) })} />
                    </label>
                    <label>
                        Poids (kg)
                        <input type="number" inputMode="decimal" step="0.5" value={brouillon.poidsKg} onChange={(e) => setBrouillon({ ...brouillon, poidsKg: Number(e.target.value) })} />
                    </label>
                    <label>
                        Masse grasse (%)
                        <input type="number" inputMode="decimal" step="0.5" value={brouillon.grasPct} onChange={(e) => setBrouillon({ ...brouillon, grasPct: Number(e.target.value) })} />
                    </label>
                    <label>
                        Né en
                        <input type="month" value={brouillon.naissance} onChange={(e) => setBrouillon({ ...brouillon, naissance: e.target.value })} />
                    </label>
                    <label className="mu-profil-large">
                        Niveau
                        <select value={brouillon.niveau} onChange={(e) => setBrouillon({ ...brouillon, niveau: e.target.value as Niveau })}>
                            {(Object.keys(NIVEAUX) as Niveau[]).map((n) => (
                                <option key={n} value={n}>
                                    {NIVEAUX[n]}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button className="mu-btn mu-profil-large" onClick={valider}>
                        ENREGISTRER
                    </button>
                </div>
            )}
        </Repliable>
    )
}
