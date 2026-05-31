import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { Team } from 'types/database'
import { useAuth } from 'hooks/useAuth'

export const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  useEffect(() => {
    supabase.from('teams').select('*').order('name').then(({ data }) => {
      setTeams(data || [])
      setLoading(false)
    })
  }, [])

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
          <div className="text-gray-400">Brak drużyn. Utwórz pierwszą!</div>
          {profile?.role === 'statystyk' && (
            <Link to="/druzyny/nowa" className="btn-primary inline-block mt-4">Utwórz drużynę</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <Link key={team.id} to={`/druzyny/${team.id}`} className="card hover:border-gray-500 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-800 flex items-center justify-center text-white font-bold text-lg">
                  {team.short_name}
                </div>
                <div>
                  <div className="font-semibold text-white group-hover:text-primary-400">{team.name}</div>
                  <div className="text-gray-500 text-sm">{team.short_name}</div>
                </div>
              </div>
            </Link>
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
    setLoading(true)
    setError('')
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
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nazwa drużyny</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="np. KS Volleyball Warszawa" required />
          </div>
          <div>
            <label className="label">Skrót (2-4 znaki)</label>
            <input className="input" value={shortName} onChange={e => setShortName(e.target.value.slice(0, 4))} placeholder="np. KSV" maxLength={4} required />
            <p className="text-gray-500 text-xs mt-1">Używany w tabelach i zestawieniach</p>
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
