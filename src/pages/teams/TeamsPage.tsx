import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { Team } from 'types/database'
import { useAuth } from 'hooks/useAuth'

export const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { profile } = useAuth()

  const load = async () => {
    const { data } = await supabase.from('teams').select('*').order('name')
    setTeams(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (team: Team) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć drużynę "${team.name}"? Usunie też wszystkich jej zawodników.`)) return
    setDeleting(team.id)
    await supabase.from('teams').delete().eq('id', team.id)
    setTeams(prev => prev.filter(t => t.id !== team.id))
    setDeleting(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Drużyny</h1>
        {profile?.role === 'statystyk' && (
          <Link to="/druzyny/nowa" className="btn-primary">+ Nowa drużyna</Link>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400">Ładowanie...</div>
      ) : teams.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">👥</div>
          <div className="text-gray-400 mb-4">Brak drużyn. Utwórz pierwszą!</div>
          {profile?.role === 'statystyk' && (
            <Link to="/druzyny/nowa" className="btn-primary inline-block">Utwórz drużynę</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <div key={team.id} className="card hover:border-gray-600 transition-colors">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary-800 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {team.short_name}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{team.name}</div>
                  <div className="text-gray-500 text-sm">{team.short_name}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/druzyny/${team.id}`} className="btn-secondary text-xs flex-1 text-center py-1.5">
                  👥 Skład
                </Link>
                {profile?.role === 'statystyk' && (
                  <>
                    <Link to={`/druzyny/${team.id}/edytuj`} className="btn-secondary text-xs px-3 py-1.5">
                      ✏️
                    </Link>
                    <button
                      onClick={() => handleDelete(team)}
                      disabled={deleting === team.id}
                      className="btn-danger text-xs px-3 py-1.5"
                    >
                      {deleting === team.id ? '...' : '🗑️'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const CreateTeamPage: React.FC = () => {
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (shortName.length < 2) { setError('Skrót musi mieć 2-4 znaki'); return }
    setLoading(true); setError('')
    const { error } = await supabase.from('teams').insert({
      name, short_name: shortName.toUpperCase(), created_by: user!.id
    })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/druzyny')
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/druzyny" className="text-gray-400 hover:text-white">← Drużyny</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-white">Nowa drużyna</h1>
      </div>
      <div className="card">
        {error && <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nazwa drużyny</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="np. KS Volleyball Warszawa" required />
          </div>
          <div>
            <label className="label">Skrót (2–4 znaki)</label>
            <input className="input" value={shortName} onChange={e => setShortName(e.target.value.slice(0, 4))} placeholder="np. KSV" maxLength={4} required />
            <p className="text-gray-500 text-xs mt-1">Używany w tabelach i tablicy wyników</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Zapisywanie...' : 'Utwórz drużynę'}</button>
            <Link to="/druzyny" className="btn-secondary">Anuluj</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export const EditTeamPage: React.FC = () => {
  const { id } = useParams()
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('teams').select('*').eq('id', id!).single().then(({ data }) => {
      if (data) { setName(data.name); setShortName(data.short_name) }
      setLoading(false)
    })
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    const { error } = await supabase.from('teams').update({
      name, short_name: shortName.toUpperCase()
    }).eq('id', id!)
    if (error) { setError(error.message); setSaving(false) }
    else navigate('/druzyny')
  }

  if (loading) return <div className="p-6 text-gray-400">Ładowanie...</div>

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/druzyny" className="text-gray-400 hover:text-white">← Drużyny</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-white">Edytuj drużynę</h1>
      </div>
      <div className="card">
        {error && <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nazwa drużyny</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Skrót (2–4 znaki)</label>
            <input className="input" value={shortName} onChange={e => setShortName(e.target.value.slice(0, 4))} maxLength={4} required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Zapisywanie...' : 'Zapisz zmiany'}</button>
            <Link to="/druzyny" className="btn-secondary">Anuluj</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

// useParams needed for EditTeamPage
function useParams() {
  return require('react-router-dom').useParams()
}
