import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { Team } from 'types/database'

const EditMatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [teams, setTeams] = useState<Team[]>([])
  const [form, setForm] = useState({
    home_team_id: '', away_team_id: '', match_date: '',
    location: '', youtube_url: '', status: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      const { data: t } = await supabase.from('teams').select('*').order('name')
      setTeams(t || [])
      const { data: m } = await supabase.from('matches').select('*').eq('id', id!).single()
      if (m) setForm({
        home_team_id: m.home_team_id, away_team_id: m.away_team_id,
        match_date: m.match_date?.slice(0, 16) || '',
        location: m.location || '', youtube_url: m.youtube_url || '',
        status: m.status,
      })
      setLoading(false)
    }
    load()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.home_team_id === form.away_team_id) { setError('Drużyny muszą być różne'); return }
    setSaving(true); setError('')
    const { error } = await supabase.from('matches').update({
      home_team_id: form.home_team_id, away_team_id: form.away_team_id,
      match_date: form.match_date, location: form.location || null,
      youtube_url: form.youtube_url || null, status: form.status,
    }).eq('id', id!)
    if (error) { setError(error.message); setSaving(false) }
    else navigate('/mecze')
  }

  if (loading) return <div className="p-6 text-gray-400">Ładowanie...</div>

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/mecze" className="text-gray-400 hover:text-white">← Mecze</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-white">Edytuj mecz</h1>
      </div>
      <div className="card">
        {error && <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Drużyna — Gospodarz</label>
            <select className="input" value={form.home_team_id} onChange={e => setForm({...form, home_team_id: e.target.value})} required>
              <option value="">Wybierz</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Drużyna — Gość</label>
            <select className="input" value={form.away_team_id} onChange={e => setForm({...form, away_team_id: e.target.value})} required>
              <option value="">Wybierz</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Data i godzina</label>
            <input className="input" type="datetime-local" value={form.match_date} onChange={e => setForm({...form, match_date: e.target.value})} required />
          </div>
          <div>
            <label className="label">Miejsce</label>
            <input className="input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="np. Hala OSiR Warszawa" />
          </div>
          <div>
            <label className="label">Link do YouTube</label>
            <input className="input" value={form.youtube_url} onChange={e => setForm({...form, youtube_url: e.target.value})} placeholder="https://www.youtube.com/watch?v=..." />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="zaplanowany">Zaplanowany</option>
              <option value="w_trakcie">W trakcie</option>
              <option value="zakończony">Zakończony</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Zapisywanie...' : 'Zapisz zmiany'}</button>
            <Link to="/mecze" className="btn-secondary">Anuluj</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditMatchPage
