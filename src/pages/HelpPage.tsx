import React, { useState } from 'react'
import { Link } from 'react-router-dom'

type Section = 'skroty' | 'druzyny' | 'format' | 'akcje' | 'jakosc' | 'technika' | 'strefy' | 'przyklady'

const HelpPage: React.FC = () => {
  const [active, setActive] = useState<Section>('format')

  const nav: [Section, string, string][] = [
    ['skroty',   '⌨️',  'Skróty klawiszowe'],
    ['druzyny',  '👥',  'Oznaczenie drużyn'],
    ['format',   '📐',  'Format kodu'],
    ['akcje',    '🏐',  'Typy akcji'],
    ['jakosc',   '⭐',  'Jakość akcji'],
    ['technika', '💪',  'Technika'],
    ['strefy',   '🗺️', 'Strefy boiska'],
    ['przyklady','📋',  'Przykłady'],
  ]

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard" className="text-gray-400 hover:text-white">← Dashboard</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-white">Instrukcja kodowania meczu</h1>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0">
          <div className="space-y-1 sticky top-6">
            {nav.map(([key, icon, label]) => (
              <button key={key} onClick={() => setActive(key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${active === key ? 'bg-primary-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                <span>{icon}</span><span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">

          {/* ── SKRÓTY ── */}
          {active === 'skroty' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">⌨️ Skróty klawiszowe</h2>
              <p className="text-gray-400 text-sm mb-4">Cała rejestracja meczu odbywa się bez odrywania rąk od klawiatury.</p>

              <div className="space-y-3 mb-6">
                {[
                  { key: 'TAB', desc: 'Nowa akcja — focus na pole kodu', detail: 'Kursor przeskakuje do pola kodu akcji. Nie wpływa na timestampy — możesz najpierw ustawić Start, potem nacisnąć TAB.' },
                  { key: 'SPACJA', desc: 'Play / Pause nagrania YouTube', detail: 'Wyłącznie sterowanie odtwarzaniem wideo. Spacja NIE zapisuje timestampów — do tego służą przyciski ⏱ Start i ⏹ Stop.' },
                  { key: 'ENTER', desc: 'Zapisz wymianę', detail: 'Zatwierdza wpisany kod i zapisuje akcje do bazy danych wraz z ustawionymi timestampami. Po zapisie pole kodu czyści się.' },
                  { key: '− / +', desc: 'Odejmij / dodaj punkt', detail: 'Małe przyciski obok wyniku. Duży środkowy przycisk z wynikiem też dodaje punkt. Aplikacja automatycznie aktualizuje rotację.' },
                  { key: '🗑', desc: 'Usuń wymianę z logu', detail: 'Przycisk kosz przy każdej wymianie w logu. W zakładce Log można usuwać pojedyncze akcje.' },
                ].map(item => (
                  <div key={item.key} className="card">
                    <div className="flex items-start gap-4">
                      <kbd className="bg-gray-700 text-white px-3 py-1.5 rounded-lg font-mono text-sm font-bold shrink-0 mt-0.5 min-w-[60px] text-center">{item.key}</kbd>
                      <div>
                        <div className="font-semibold text-white mb-1">{item.desc}</div>
                        <div className="text-gray-400 text-sm">{item.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timestamp buttons */}
              <div className="card mb-4 bg-green-900/10 border-green-800">
                <div className="text-green-300 font-semibold mb-3">⏱ Przyciski timestampów (pod odtwarzaczem)</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="bg-gray-800 border border-green-700 text-green-300 px-3 py-1 rounded-lg font-semibold text-xs shrink-0">⏱ Start</span>
                    <span className="text-gray-300">Kliknij w momencie gdy akcja się zaczyna (np. moment serwisu). Zapisuje aktualny czas wideo. Możesz kliknąć wielokrotnie — zawsze nadpisuje poprzedni czas.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-gray-800 border border-red-700 text-red-300 px-3 py-1 rounded-lg font-semibold text-xs shrink-0">⏹ Stop</span>
                    <span className="text-gray-300">Kliknij gdy akcja się kończy (piłka pada na ziemię). Aktywny dopiero po kliknięciu Start.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded-lg font-semibold text-xs shrink-0">✕</span>
                    <span className="text-gray-300">Czyści oba timestampy. Pojawia się gdy któryś jest ustawiony.</span>
                  </div>
                </div>
              </div>

              <div className="card bg-blue-900/20 border-blue-700">
                <div className="text-blue-300 font-semibold mb-2">💡 Typowy flow rejestracji wymiany</div>
                <ol className="text-gray-300 text-sm space-y-1.5 list-decimal list-inside">
                  <li>Przewiń wideo do momentu tuż przed serwisem</li>
                  <li>Kliknij <span className="bg-gray-800 text-green-300 px-1.5 rounded text-xs font-mono">⏱ Start</span> — zapisuje czas początku</li>
                  <li>Oglądaj wymianę — pauzuj i przewijaj ile chcesz (<kbd className="bg-gray-700 px-1 rounded text-xs">SPACJA</kbd>)</li>
                  <li>Kliknij <span className="bg-gray-800 text-red-300 px-1.5 rounded text-xs font-mono">⏹ Stop</span> gdy piłka pada</li>
                  <li>Naciśnij <kbd className="bg-gray-700 px-1 rounded text-xs">TAB</kbd> — focus na pole kodu</li>
                  <li>Wpisz kod wymiany np. <span className="font-mono text-green-400">8S6F- / a13R+ / a1E4Q / a7A6H*</span></li>
                  <li>Naciśnij <kbd className="bg-gray-700 px-1 rounded text-xs">ENTER</kbd> — zapisuje z timestampami</li>
                  <li>Kliknij na wynik odpowiedniej drużyny aby dodać punkt</li>
                </ol>
              </div>
            </div>
          )}

          {/* ── DRUŻYNY ── */}
          {active === 'druzyny' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">👥 Oznaczenie drużyn w kodzie</h2>
              <p className="text-gray-400 text-sm mb-6">
                System wzorowany na DataVolley i VolleyStation — prefix drużyny rozwiązuje problem gdy obie drużyny mają zawodnika z tym samym numerem.
              </p>

              {/* Main rule */}
              <div className="card bg-gray-800 mb-6">
                <div className="text-xs text-gray-500 uppercase mb-3">Zasada ogólna</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-center">
                    <div className="font-mono text-3xl font-bold text-white mb-2">13S6F-</div>
                    <div className="text-blue-300 text-sm font-semibold">= Gospodarz #13</div>
                    <div className="text-gray-400 text-xs mt-1">Brak prefiksu = domyślnie gospodarz</div>
                    <div className="text-gray-500 text-xs mt-0.5">Równoważne z: <span className="font-mono text-gray-400">*13S6F-</span></div>
                  </div>
                  <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4 text-center">
                    <div className="font-mono text-3xl font-bold text-white mb-2">a13R+</div>
                    <div className="text-orange-300 text-sm font-semibold">= Gość #13</div>
                    <div className="text-gray-400 text-xs mt-1">Prefiks <span className="font-mono">a</span> = zawodnik gości</div>
                    <div className="text-gray-500 text-xs mt-0.5">Prefiks <span className="font-mono">*</span> też działa dla gospodarza</div>
                  </div>
                </div>
              </div>

              {/* When to use */}
              <div className="card mb-4">
                <div className="text-white font-semibold mb-3">Kiedy używać prefiksu?</div>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                    <div>
                      <div className="text-white">Gdy obie drużyny mają zawodnika z tym samym numerem</div>
                      <div className="text-gray-400 text-xs mt-0.5">Np. gospodarz ma #11 i gość ma #11 — bez prefiksu aplikacja domyślnie przypisze do gospodarza.</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                    <div>
                      <div className="text-white">Przy akcjach drużyny gości (blok, obrona, kontratak)</div>
                      <div className="text-gray-400 text-xs mt-0.5">Np. atak zakończony blokiem gości: <span className="font-mono text-green-400">10A6H- / a7B+</span></div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-yellow-400 shrink-0 mt-0.5">→</span>
                    <div>
                      <div className="text-white">Gdy numery są unikalne między drużynami — prefiks opcjonalny</div>
                      <div className="text-gray-400 text-xs mt-0.5">Jeśli tylko gospodarz ma #11, a gość nie — możesz pisać <span className="font-mono">11R+</span> bez prefiksu.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Examples */}
              <div className="card">
                <div className="text-white font-semibold mb-3">Przykłady wymian z obu drużyn</div>
                <div className="space-y-3">
                  {[
                    {
                      code: '8S6F- / a13R+ / a1E4Q / a7A6H*',
                      desc: 'Gospodarz #8 serwuje → Gość #13 przyjmuje → Gość #1 rozgrywa → Gość #7 atakuje, punkt',
                      note: 'Akcje gości oznaczone prefiksem a'
                    },
                    {
                      code: '10A4H- / a3B+',
                      desc: 'Gospodarz #10 atakuje, zatrzymany → Gość #3 blokuje pozytywnie',
                      note: 'Blok aut — atak odgrywa się na aut (+ dla atakującego, + dla blokującego)'
                    },
                    {
                      code: 'a8S1J* ',
                      desc: 'Gość #8 jump serve w strefę 1 — as, punkt dla gości',
                      note: 'Serwis gości: prefiks a wymagany'
                    },
                    {
                      code: '11A4H* / a11B/',
                      desc: 'Gospodarz #11 atakuje punkt → Gość #11 próbuje blokować — błąd',
                      note: 'Oba zawodniki mają #11 — prefiks konieczny!'
                    },
                  ].map((ex, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-3">
                      <div className="font-mono text-sm text-green-400 mb-1">{ex.code}</div>
                      <div className="text-gray-300 text-xs mb-1">{ex.desc}</div>
                      <div className="text-gray-500 text-xs italic">{ex.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── FORMAT ── */}
          {active === 'format' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">📐 Format kodu akcji</h2>
              <p className="text-gray-400 text-sm mb-6">Kod opisuje całą wymianę — od serwisu do zakończenia punktu. Akcje oddziela się spacją lub <span className="font-mono bg-gray-800 px-1 rounded">/</span>.</p>

              <div className="card mb-6 bg-gray-800">
                <div className="text-xs text-gray-500 mb-2 uppercase">Pełna struktura jednej akcji</div>
                <div className="font-mono text-xl tracking-widest text-center py-3">
                  <span className="text-orange-400">[a/*]</span>
                  <span className="text-blue-400">[nr]</span>
                  <span className="text-yellow-400">[TYP]</span>
                  <span className="text-gray-300">[strefa]</span>
                  <span className="text-green-400">[technika]</span>
                  <span className="text-red-400">[jakość]</span>
                </div>
                <div className="flex flex-wrap justify-center gap-4 text-xs mt-2">
                  <span><span className="text-orange-400 font-bold">pomarańcz</span> = drużyna (opcjonalne: a=gość, *=gospodarz)</span>
                  <span><span className="text-blue-400 font-bold">niebieski</span> = numer zawodnika (1–99)</span>
                  <span><span className="text-yellow-400 font-bold">żółty</span> = typ akcji</span>
                  <span><span className="text-gray-300 font-bold">szary</span> = strefa (1–6)</span>
                  <span><span className="text-green-400 font-bold">zielony</span> = technika</span>
                  <span><span className="text-red-400 font-bold">czerwony</span> = jakość/wynik</span>
                </div>
              </div>

              <div className="card mb-4 bg-gray-800">
                <div className="text-xs text-gray-500 mb-3 uppercase">Przykład wymiany z obu drużyn</div>
                <div className="font-mono text-base text-center py-2 tracking-wider leading-relaxed">
                  <span className="text-blue-400">8</span><span className="text-yellow-400">S</span><span className="text-gray-300">6</span><span className="text-green-400">F</span><span className="text-red-400">-</span>
                  <span className="text-gray-600"> / </span>
                  <span className="text-orange-400">a</span><span className="text-blue-400">13</span><span className="text-yellow-400">R</span><span className="text-red-400">+</span>
                  <span className="text-gray-600"> / </span>
                  <span className="text-orange-400">a</span><span className="text-blue-400">1</span><span className="text-yellow-400">E</span><span className="text-gray-300">4</span><span className="text-green-400">Q</span>
                  <span className="text-gray-600"> / </span>
                  <span className="text-orange-400">a</span><span className="text-blue-400">7</span><span className="text-yellow-400">A</span><span className="text-gray-300">6</span><span className="text-green-400">H</span><span className="text-red-400">*</span>
                </div>
                <div className="text-gray-400 text-sm text-center mt-2">
                  Gosp. #8 float w strefę 6 (negatywny) → Gość #13 przyjęcie pozytywne → Gość #1 wystawa szybka do 4 → Gość #7 atak mocny w strefę 6, punkt
                </div>
              </div>

              <div className="card bg-yellow-900/20 border-yellow-700">
                <div className="text-yellow-300 font-semibold mb-2">⚠️ Ważne zasady</div>
                <ul className="text-gray-300 text-sm space-y-1.5 list-disc list-inside">
                  <li>Duże i małe litery są równoważne — <span className="font-mono">5r+</span> = <span className="font-mono">5R+</span></li>
                  <li>Brak prefiksu = gospodarz. Prefiks <span className="font-mono">a</span> = gość.</li>
                  <li>Nie ma spacji w obrębie jednej akcji — <span className="font-mono text-red-400">5 R+</span> to błąd</li>
                  <li>Akcje dzielisz spacją lub ukośnikiem: <span className="font-mono">5R+ 10A6H*</span> lub <span className="font-mono">5R+ / 10A6H*</span></li>
                  <li>Dla serwisu jedna cyfra = strefa docelowa: <span className="font-mono">8S6F</span> = serwis W strefę 6</li>
                  <li>Podgląd pod polem kodu pokazuje interpretację na bieżąco</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── AKCJE ── */}
          {active === 'akcje' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">🏐 Typy akcji</h2>
              <div className="space-y-3">
                {[
                  { code: 'S', name: 'Serwis', format: '[a][nr]S[strefa_do][technika][jakość]', desc: 'Zawodnik serwuje. Strefa = strefa na boisku przeciwnika gdzie ląduje piłka (1 cyfra). Dwie cyfry: pierwsza = strefa wyjścia, druga = cel. Jakość opisuje efekt na przyjęcie.', example: '8S6F-', exampleDesc: '#8 float serve w strefę 6, negatywny (łatwy do przyjęcia)' },
                  { code: 'R', name: 'Przyjęcie', format: '[a][nr]R[jakość]', desc: 'Przyjęcie serwisu. Jakość jest najważniejsza: # perfekcyjne, + pozytywne, - negatywne, / błąd. Strefa obliczana automatycznie z rotacji.', example: 'a13R#', exampleDesc: 'Gość #13 przyjęcie perfekcyjne' },
                  { code: 'E', name: 'Rozegranie', format: '[a][nr]E[strefa_do][tempo]', desc: 'Rozgrywający wystawia. Strefa = gdzie atakuje zawodnik. Tempo: Q szybka (jedynka/dwójka), P pipe/planowana.', example: 'a1E4Q', exampleDesc: 'Gość #1 wystawa szybka do strefy 4' },
                  { code: 'A', name: 'Atak', format: '[a][nr]A[strefa_do][technika][jakość]', desc: 'Atak przez siatkę. Strefa = strefa na boisku przeciwnika. * = punkt (w tym blok aut), / = błąd, - = obroniony.', example: 'a7A6H*', exampleDesc: 'Gość #7 atak mocny w strefę 6, punkt (blok aut też = *)' },
                  { code: 'B', name: 'Blok', format: '[a][nr]B[jakość]', desc: 'Blok przy siatce. * punkt (blok bezpośredni), + zatrzymanie (piłka w grze), - odgrywa w aut (atak dostaje *), / błąd bloku.', example: 'a3B+', exampleDesc: 'Gość #3 blok zatrzymujący (piłka wraca)' },
                  { code: 'D', name: 'Obrona (dig)', format: '[a][nr]D[jakość]', desc: 'Obrona ataku (dig). # lub + skuteczna, - trudna ale w grze, / błąd (piłka pada).', example: '1D+', exampleDesc: '#1 obrona pozytywna' },
                  { code: 'K', name: 'Kiwka', format: '[a][nr]K[strefa_do][jakość]', desc: 'Atak kiwką (dink). Strefa = gdzie trafia piłka. * punkt, / błąd.', example: '7K2*', exampleDesc: '#7 kiwka w strefę 2, punkt' },
                  { code: 'F', name: 'Free ball', format: '[a][nr]F[jakość]', desc: 'Piłka przerzucona przez siatkę bez ataku (palcami, po zbyt wysokim podaniu). Jakość jak przy przyjęciu.', example: 'a5F+', exampleDesc: 'Gość #5 free ball pozytywny' },
                ].map(a => (
                  <div key={a.code} className="card">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-yellow-900 flex items-center justify-center font-mono font-bold text-yellow-300 text-xl shrink-0">{a.code}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="font-semibold text-white">{a.name}</span>
                          <span className="font-mono text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{a.format}</span>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">{a.desc}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-green-400 text-sm bg-gray-800 px-2 py-0.5 rounded">{a.example}</span>
                          <span className="text-gray-500 text-sm">= {a.exampleDesc}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── JAKOŚĆ ── */}
          {active === 'jakosc' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">⭐ Kody jakości i wyniku</h2>
              <p className="text-gray-400 text-sm mb-6">Jakość opisuje wynik akcji dla wykonującego. Bezpośrednio wpływa na wszystkie statystyki procentowe.</p>
              <div className="space-y-3">
                {[
                  { code: '#', name: 'Perfekcyjne / As', color: 'bg-blue-900 text-blue-300', desc: 'Idealne wykonanie. Przyjęcie: piłka dokładnie do rozgrywającego, wystawia ze wszystkich opcji. Serwis: as (piłka pada bez przyjęcia lub przyjęcie nie daje gry).' },
                  { code: '+', name: 'Pozytywne', color: 'bg-green-900 text-green-300', desc: 'Dobre wykonanie. Przyjęcie: piłka do rozgrywającego ale wystawia w ruchu, ograniczone opcje. Atak: punkt lub blok aut. Blok: zatrzymanie piłki (gra trwa).' },
                  { code: '!', name: 'Overpass / Trudne', color: 'bg-yellow-900 text-yellow-300', desc: 'Przyjęcie lub obrona trafia za siatkę do przeciwnika (overpass). Lub ogólnie trudne wykonanie które utrudnia dalszą grę ale piłka jest w grze.' },
                  { code: '-', name: 'Negatywne', color: 'bg-orange-900 text-orange-300', desc: 'Złe wykonanie. Przyjęcie: piłka nie trafia do rozgrywającego, gra z boku. Serwis: łatwy dla przyjmującego, setter ma wszystkie opcje. Atak: piłka obroniona przez przeciwnika.' },
                  { code: '/', name: 'Błąd', color: 'bg-red-900 text-red-300', desc: 'Bezpośredni błąd — utrata punktu. Piłka w siatce, na aut, błąd serwisu, atak zablokowany w punkt, błąd bloku (dotknięcie siatki).' },
                  { code: '*', name: 'Punkt bezpośredni', color: 'bg-emerald-900 text-emerald-300', desc: 'Akcja kończy się zdobyciem punktu bezpośrednio. Dla ataku: punkt niezależnie od drogi (czysto, blok aut, aut po obronie). Dla bloku: blok bezpośrednio punktowy.' },
                ].map(q => (
                  <div key={q.code} className="card flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-mono font-bold text-2xl shrink-0 ${q.color}`}>{q.code}</div>
                    <div>
                      <div className="font-semibold text-white mb-1">{q.name}</div>
                      <p className="text-gray-400 text-sm">{q.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card mt-5 bg-gray-800">
                <div className="text-sm font-semibold text-white mb-2">📊 Jak liczy się skuteczność (DataVolley/AVCA)</div>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2 items-start">
                    <span className="text-yellow-400 font-mono shrink-0">Atak:</span>
                    <span className="text-gray-300">Hitting Efficiency = (Kill − Błędy) / Próby. Wartość +0.300 = dobra, powyżej +0.400 = doskonała.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="text-blue-400 font-mono shrink-0">Przyjęcie:</span>
                    <span className="text-gray-300">Avg (0–3): Perfekcyjne×3 + Pozytywne×2 + Overpass×1, podzielone przez liczbę przyjęć. Exc% = tylko perfekcyjne. Pos% = perfekcyjne + pozytywne.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="text-green-400 font-mono shrink-0">Serwis:</span>
                    <span className="text-gray-300">Ace% = asy / wszystkie serwisy. Eff% = (Asy − Błędy) / Serwisy.</span>
                  </div>
                </div>
              </div>

              <div className="card mt-3 bg-blue-900/10 border-blue-800">
                <div className="text-blue-300 font-semibold text-sm mb-2">💡 Zależność serwis ↔ przyjęcie</div>
                <p className="text-gray-400 text-xs">Jakość serwisu i przyjęcia są ze sobą powiązane. Jeśli serwis jest <span className="font-mono text-red-400">-</span> (negatywny = łatwy), przyjęcie przeciwnika powinno być <span className="font-mono text-blue-400">#</span> (perfekcyjne). Jeśli serwis jest <span className="font-mono text-green-400">+</span> (pozytywny = agresywny), przyjęcie będzie <span className="font-mono text-orange-400">-</span> lub <span className="font-mono text-yellow-400">!</span>. As serwisowy (<span className="font-mono text-blue-400">#</span> lub <span className="font-mono text-emerald-400">*</span>) = błąd przyjęcia (<span className="font-mono text-red-400">/</span>) po stronie przeciwnika.</p>
              </div>
            </div>
          )}

          {/* ── TECHNIKA ── */}
          {active === 'technika' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">💪 Kody techniki</h2>
              <p className="text-gray-400 text-sm mb-6">Technika opisuje sposób wykonania akcji. Używana głównie przy serwisach i atakach — opcjonalna, ale wzbogaca statystyki.</p>
              <div className="space-y-3">
                {[
                  { code: 'H', name: 'Mocny (Hard)', akcje: 'Atak, Serwis', desc: 'Mocne uderzenie z pełną siłą. Najczęstszy kod dla ataków z wyskoku i powerowych serwisów.' },
                  { code: 'T', name: 'Topspin / Liniowy', akcje: 'Atak', desc: 'Atak ze spinową rotacją piłki lub atak liniowy wzdłuż linii bocznej (cross).' },
                  { code: 'Q', name: 'Szybka (Quick)', akcje: 'Rozegranie', desc: 'Szybka wystawa — nisko i krótko, atakujący uderza tuż za dłońmi rozgrywającego (jedynka / dwójka). Najtrudniejsza do zablokowania.' },
                  { code: 'P', name: 'Pipe / Planowany', akcje: 'Rozegranie, Atak', desc: 'Atak ze środka boiska (strefa 6) lub planowany — zawodnik atakuje z rozbiegu z głębi boiska.' },
                  { code: 'J', name: 'Jump serve', akcje: 'Serwis', desc: 'Serwis z wyskoku jak przy ataku. Najgroźniejszy rodzaj serwisu — duże ryzyko błędu, duże ryzyko asa.' },
                  { code: 'F', name: 'Float serve', akcje: 'Serwis', desc: 'Serwis bez rotacji piłki. Piłka leci nieprzewidywalnie, zmienia tor lotu w powietrzu. Trudny do przyjęcia przy dużej sile.' },
                ].map(t => (
                  <div key={t.code} className="card flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-green-900 flex items-center justify-center font-mono font-bold text-2xl text-green-300 shrink-0">{t.code}</div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-white">{t.name}</span>
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{t.akcje}</span>
                      </div>
                      <p className="text-gray-400 text-sm">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STREFY ── */}
          {active === 'strefy' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">🗺️ Strefy boiska</h2>
              <p className="text-gray-400 text-sm mb-6">Boisko podzielone na 6 stref wg numeracji FIVB. Strefy są zawsze z perspektywy drużyny wykonującej akcję.</p>

              <div className="flex gap-8 flex-wrap">
                <div>
                  <div className="text-sm text-gray-400 mb-2 text-center">Widok boiska (siatka u góry)</div>
                  <div className="border-t-4 border-gray-300 mb-1">
                    <div className="text-xs text-center text-gray-500 mb-1">— siatka —</div>
                  </div>
                  <div className="border-2 border-gray-500 rounded-b-lg overflow-hidden w-48">
                    {[[4,3,2],[5,6,1]].map((row, ri) => (
                      <div key={ri} className="flex border-b border-gray-600 last:border-b-0">
                        {row.map(z => (
                          <div key={z} className="flex-1 h-20 flex flex-col items-center justify-center border-r border-gray-600 last:border-r-0 bg-gray-800">
                            <div className="text-2xl font-bold text-white">{z}</div>
                            <div className="text-xs text-gray-400">
                              {z === 1 ? 'PP tył' : z === 2 ? 'PP przód' : z === 3 ? 'Śr przód' : z === 4 ? 'PL przód' : z === 5 ? 'PL tył' : 'Śr tył'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="border-t-2 border-gray-500 mt-1">
                    <div className="text-xs text-center text-gray-500 mt-1">— linia końcowa —</div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2 text-center">← lewa | prawa →</div>
                </div>

                <div className="flex-1">
                  <div className="space-y-2 text-sm mb-4">
                    {[
                      { z: 1, name: 'Prawy tył', pos: 'Pozycja serwisowa. Libero lub przyjmujący.' },
                      { z: 2, name: 'Prawy przód', pos: 'Przy siatce po prawej. Atakujący lub rozgrywający.' },
                      { z: 3, name: 'Środek przód', pos: 'Środek przy siatce. Środkowy lub rozgrywający.' },
                      { z: 4, name: 'Lewy przód', pos: 'Przy siatce po lewej. Główna pozycja atakująca.' },
                      { z: 5, name: 'Lewy tył', pos: 'Tył po lewej. Przyjmujący lub libero.' },
                      { z: 6, name: 'Środek tył', pos: 'Środek tyłu. Libero lub zawodnik obronny.' },
                    ].map(z => (
                      <div key={z.z} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center font-bold text-white shrink-0">{z.z}</div>
                        <div><span className="font-medium text-white">{z.name}</span><span className="text-gray-500"> — {z.pos}</span></div>
                      </div>
                    ))}
                  </div>

                  <div className="card bg-blue-900/20 border-blue-700">
                    <div className="text-blue-300 font-semibold mb-2 text-sm">💡 Jak używać stref w kodzie</div>
                    <ul className="text-gray-300 text-xs space-y-1 list-disc list-inside">
                      <li><strong>Serwis:</strong> strefa = gdzie ląduje na boisku PRZECIWNIKA. <span className="font-mono">8S6F</span> = serwuje w strefę 6 przeciwnika</li>
                      <li><strong>Atak:</strong> strefa = gdzie ląduje na boisku PRZECIWNIKA</li>
                      <li><strong>Rozegranie:</strong> strefa = skąd atakuje zawodnik (na własnym boisku)</li>
                      <li><strong>Przyjęcie/Obrona:</strong> strefa opcjonalna — wynika z rotacji</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PRZYKŁADY ── */}
          {active === 'przyklady' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">📋 Przykłady kompletnych wymian</h2>
              <div className="space-y-4">
                {[
                  {
                    title: 'Prosta wymiana — punkt dla gości',
                    code: '8S6F- / a13R+ / a1E4Q / a7A6H*',
                    steps: [
                      { code: '8S6F-', desc: 'Gosp. #8 float serve w strefę 6, negatywny (łatwy)' },
                      { code: 'a13R+', desc: 'Gość #13 przyjęcie pozytywne' },
                      { code: 'a1E4Q', desc: 'Gość #1 wystawa szybka do strefy 4' },
                      { code: 'a7A6H*', desc: 'Gość #7 atak mocny w strefę 6, punkt' },
                    ]
                  },
                  {
                    title: 'As serwisowy (gospodarz)',
                    code: '7SJ#',
                    steps: [
                      { code: '7SJ#', desc: 'Gosp. #7 jump serve — as (piłka pada bez przyjęcia)' },
                    ]
                  },
                  {
                    title: 'Blok aut — atak zdobywa punkt',
                    code: 'a8S5F+ / 13R# / 6E2Q / 10A4H*',
                    steps: [
                      { code: 'a8S5F+', desc: 'Gość #8 float serve w strefę 5, pozytywny (trudny)' },
                      { code: '13R#', desc: 'Gosp. #13 przyjęcie perfekcyjne' },
                      { code: '6E2Q', desc: 'Gosp. #6 wystawa szybka do strefy 2' },
                      { code: '10A4H*', desc: 'Gosp. #10 atak mocny w strefę 4, punkt — blok aut lub czysto' },
                    ]
                  },
                  {
                    title: 'Blok punktowy (gość blokuje atak gospodarza)',
                    code: '10A4H/ / a7B*',
                    steps: [
                      { code: '10A4H/', desc: 'Gosp. #10 atak mocny — błąd (zablokowany)' },
                      { code: 'a7B*', desc: 'Gość #7 blok punktowy' },
                    ]
                  },
                  {
                    title: 'Obaj zawodnicy mają numer 11 — użyj prefiksu',
                    code: '11S1J+ / a11R- / a4E4P / a9A6H*',
                    steps: [
                      { code: '11S1J+', desc: 'GOSP. #11 jump serve w strefę 1, pozytywny' },
                      { code: 'a11R-', desc: 'GOŚĆ #11 przyjęcie negatywne — prefix a wymagany!' },
                      { code: 'a4E4P', desc: 'Gość #4 wystawa planowana do strefy 4' },
                      { code: 'a9A6H*', desc: 'Gość #9 atak mocny w strefę 6, punkt' },
                    ]
                  },
                  {
                    title: 'Błąd serwisu',
                    code: '8S/',
                    steps: [
                      { code: '8S/', desc: 'Gosp. #8 serwis — błąd (siatka lub aut) → punkt dla gości' },
                    ]
                  },
                  {
                    title: 'Długa wymiana z obroną i kontratakieem',
                    code: '2S1F+ / a5R# / a6E2Q / a10A5H- / 3D+ / 7E4P / 10A6H*',
                    steps: [
                      { code: '2S1F+', desc: 'Gosp. #2 float serve w strefę 1, pozytywny' },
                      { code: 'a5R#', desc: 'Gość #5 przyjęcie perfekcyjne' },
                      { code: 'a6E2Q', desc: 'Gość #6 wystawa szybka do strefy 2' },
                      { code: 'a10A5H-', desc: 'Gość #10 atak mocny w strefę 5, obroniony' },
                      { code: '3D+', desc: 'Gosp. #3 obrona pozytywna' },
                      { code: '7E4P', desc: 'Gosp. #7 wystawa planowana (pipe) do strefy 4' },
                      { code: '10A6H*', desc: 'Gosp. #10 atak mocny w strefę 6, punkt' },
                    ]
                  },
                ].map((ex, i) => (
                  <div key={i} className="card">
                    <div className="font-semibold text-white mb-3">{ex.title}</div>
                    <div className="font-mono text-sm bg-gray-800 rounded-lg px-4 py-2.5 mb-3 text-green-400 tracking-wide break-all">
                      {ex.code}
                    </div>
                    <div className="space-y-1.5">
                      {ex.steps.map((s, si) => (
                        <div key={si} className="flex items-center gap-3 text-sm">
                          <span className="font-mono text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded w-28 text-center shrink-0">{s.code}</span>
                          <span className="text-gray-400">{s.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default HelpPage
