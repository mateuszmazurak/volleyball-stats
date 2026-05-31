import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { Team } from '../../types/database'
import { useAuth } from 'hooks/useAuth'

const CreateMatchPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([])
  const [form, setForm] = useState({
    home_team_id: '',
    away_team_id: '',
    match_date: new Date().toISOString().slice(0, 16),
    location: '',
    youtube_url: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    supabase.from('teams').select('*').order('name').then(({ data }) => setTeams(data || []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.home_team_id === form.away_team_id) {
      setError('Drużyna gospodarz i gość muszą być różne')
      return
    }
    setLoading(true)
    setError('')

    const { data, error } = await supabase.from('matches').insert({
      home_team_id: form.home_team_id,
      away_team_id: form.away_team_id,
      match_date: form.match_date,
      location: form.location || null,
      youtube_url: form.youtube_url || null,
      status: 'zaplanowany',
      created_by: user!.id,
    }).select().single()

    if (error) { setError(error.message); setLoading(false) }
    else navigate(`/mecze/${data.id}`)
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/mecze" className="text-gray-400 hover:text-white">← Mecze</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-white">Nowy mecz</h1>
      </div>

      <div className="card">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Drużyna — Gospodarz</label>
            <select className="input" value={form.home_team_id} onChange={e => setForm({...form, home_team_id: e.target.value})} required>
              <option value="">Wybierz drużynę</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Drużyna — Gość</label>
            <select className="input" value={form.away_team_id} onChange={e => setForm({...form, away_team_id: e.target.value})} required>
              <option value="">Wybierz drużynę</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Data i godzina</label>
            <input className="input" type="datetime-local" value={form.match_date} onChange={e => setForm({...form, match_date: e.target.value})} required />
          </div>
          <div>
            <label className="label">Miejsce (opcjonalnie)</label>
            <input className="input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="np. Hala OSiR Warszawa" />
          </div>
          <div>
            <label className="label">Link do YouTube (opcjonalnie)</label>
            <input className="input" value={form.youtube_url} onChange={e => setForm({...form, youtube_url: e.target.value})} placeholder="https://www.youtube.com/watch?v=..." />
            <p className="text-gray-500 text-xs mt-1">Można dodać później</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading || !form.home_team_id || !form.away_team_id} className="btn-primary">
              {loading ? 'Tworzenie...' : 'Utwórz mecz'}
            </button>
            <Link to="/mecze" className="btn-secondary">Anuluj</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateMatchPage
