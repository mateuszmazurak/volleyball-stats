import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { Player, Team, PlayerPosition } from 'types/database'

const POSITIONS: Record<PlayerPosition, string> = {
  atakujacy: 'Atakujący',
  przyjmujacy: 'Przyjmujący',
  rozgrywajacy: 'Rozgrywający',
  libero: 'Libero',
  srodkowy: 'Środkowy',
  uniwersalny: 'Uniwersalny',
}

const POSITION_COLORS: Record<PlayerPosition, string> = {
  atakujacy: 'bg-red-900 text-red-300',
  przyjmujacy: 'bg-blue-900 text-blue-300',
  rozgrywajacy: 'bg-yellow-900 text-yellow-300',
  libero: 'bg-purple-900 text-purple-300',
  srodkowy: 'bg-green-900 text-green-300',
  uniwersalny: 'bg-gray-700 text-gray-300',
}

export const PlayersPage: React.FC = () => {
  const [players, setPlayers] = useState<(Player & { team: Team })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('players').select('*, team:teams(*)').order('full_name').then(({ data }) => {
      setPlayers((data as any) || [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Zawodnicy</h1>
        <Link to="/zawodnicy/nowy" className="btn-primary">+ Nowy zawodnik</Link>
      </div>

      {loading ? (
        <div className="text-gray-400">Ładowanie...</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                <th className="text-left px-5 py-3 text-gray-400 font-medium">#</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Zawodnik</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Drużyna</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Pozycja</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                  <td className="px-5 py-3 text-gray-400 font-mono">{p.jersey_number}</td>
                  <td className="px-5 py-3"><Link to={`/zawodnicy/${p.id}/statystyki`} className="text-white font-medium hover:text-primary-400">{p.full_name}</Link></td>
                  <td className="px-5 py-3 text-gray-300">{p.team?.name}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${POSITION_COLORS[p.position]}`}>
                      {POSITIONS[p.position]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {players.length === 0 && (
            <div className="text-center py-12 text-gray-400">Brak zawodników</div>
          )}
        </div>
      )}
    </div>
  )
}

export const CreatePlayerPage: React.FC = () => {
  const [form, setForm] = useState({ full_name: '', jersey_number: '', position: 'przyjmujacy' as PlayerPosition, team_id: '' })
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('teams').select('*').order('name').then(({ data }) => setTeams(data || []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.from('players').insert({
      full_name: form.full_name,
      jersey_number: parseInt(form.jersey_number),
      position: form.position,
      team_id: form.team_id,
      user_id: null,
    })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/zawodnicy')
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/zawodnicy" className="text-gray-400 hover:text-white">← Zawodnicy</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-white">Nowy zawodnik</h1>
      </div>

      <div className="card">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Imię i nazwisko</label>
            <input className="input" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="np. Jan Kowalski" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Numer na koszulce</label>
              <input className="input" type="number" min="1" max="99" value={form.jersey_number} onChange={e => setForm({...form, jersey_number: e.target.value})} required />
            </div>
            <div>
              <label className="label">Pozycja</label>
              <select className="input" value={form.position} onChange={e => setForm({...form, position: e.target.value as PlayerPosition})}>
                {Object.entries(POSITIONS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Drużyna</label>
            <select className="input" value={form.team_id} onChange={e => setForm({...form, team_id: e.target.value})} required>
              <option value="">Wybierz drużynę</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading || !form.team_id} className="btn-primary">{loading ? 'Zapisywanie...' : 'Dodaj zawodnika'}</button>
            <Link to="/zawodnicy" className="btn-secondary">Anuluj</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
