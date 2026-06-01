import React, { useState } from 'react'
import { Link } from 'react-router-dom'

type Section = 'skroty' | 'format' | 'akcje' | 'jakosc' | 'technika' | 'przyklady' | 'strefy'

const HelpPage: React.FC = () => {
  const [active, setActive] = useState<Section>('format')

  const nav: [Section, string, string][] = [
    ['skroty', '⌨️', 'Skróty klawiszowe'],
    ['format', '📐', 'Format kodu'],
    ['akcje', '🏐', 'Typy akcji'],
    ['jakosc', '⭐', 'Jakość akcji'],
    ['technika', '💪', 'Technika'],
    ['strefy', '🗺️', 'Strefy boiska'],
    ['przyklady', '📋', 'Przykłady'],
  ]

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard" className="text-gray-400 hover:text-white">← Dashboard</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-white">Instrukcja kodowania meczu</h1>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-48 shrink-0">
          <div className="space-y-1 sticky top-6">
            {nav.map(([key, icon, label]) => (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${active === key ? 'bg-primary-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              >
                <span>{icon}</span><span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* SKRÓTY */}
          {active === 'skroty' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">⌨️ Skróty klawiszowe</h2>
              <p className="text-gray-400 text-sm mb-4">Cała rejestracja meczu odbywa się bez odrywania rąk od klawiatury.</p>
              <div className="space-y-3">
                {[
                  { key: 'TAB', desc: 'Rozpocznij nową wymianę', detail: 'Kursor przeskakuje do pola kodu. W tym momencie zapisywany jest timestamp startowy z YouTube (jeśli wideo jest odtwarzane).' },
                  { key: 'SPACJA', desc: 'Play / Pause nagrania YouTube', detail: 'Działa tylko gdy kursor NIE jest w polu kodu. Pierwsze naciśnięcie uruchamia wideo, drugie zatrzymuje i zapisuje timestamp końcowy.' },
                  { key: 'ENTER', desc: 'Zapisz wymianę', detail: 'Zatwierdza wpisany kod, zapisuje akcje do bazy danych wraz z timestampami YouTube. Wideo zostaje zatrzymane.' },
                  { key: 'Klik na wynik', desc: 'Dodaj punkt drużynie', detail: 'Kliknięcie na wynik (np. "3") po lewej dodaje punkt gospodarzom, po prawej — gościom. Automatycznie aktualizuje rotację.' },
                ].map(item => (
                  <div key={item.key} className="card">
                    <div className="flex items-start gap-4">
                      <kbd className="bg-gray-700 text-white px-3 py-1.5 rounded-lg font-mono text-sm font-bold shrink-0 mt-0.5">{item.key}</kbd>
                      <div>
                        <div className="font-semibold text-white mb-1">{item.desc}</div>
                        <div className="text-gray-400 text-sm">{item.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card mt-4 bg-blue-900/20 border-blue-700">
                <div className="text-blue-300 font-semibold mb-2">💡 Typowy flow rejestracji wymiany</div>
                <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
                  <li>Wideo jest wstrzymane — zawodnik wykonuje serwis</li>
                  <li>Naciśnij <kbd className="bg-gray-700 px-1 rounded text-xs">SPACJA</kbd> aby uruchomić wideo</li>
                  <li>Naciśnij <kbd className="bg-gray-700 px-1 rounded text-xs">TAB</kbd> — zatrzymuje wideo, zapisuje czas startowy</li>
                  <li>Wpisz kod wymiany np. <span className="font-mono text-green-400">2S2H / 5R+ / 10A6H*</span></li>
                  <li>Naciśnij <kbd className="bg-gray-700 px-1 rounded text-xs">ENTER</kbd> — zapisuje wymianę</li>
                  <li>Kliknij na wynik odpowiedniej drużyny aby dodać punkt</li>
                  <li>Powtórz od kroku 1</li>
                </ol>
              </div>
            </div>
          )}

          {/* FORMAT */}
          {active === 'format' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">📐 Format kodu akcji</h2>
              <p className="text-gray-400 text-sm mb-6">Kod opisuje całą wymianę — od serwisu do zakończenia punktu. Akcje oddziela się spacją lub <span className="font-mono bg-gray-800 px-1 rounded">/</span>.</p>

              <div className="card mb-6 bg-gray-800">
                <div className="text-xs text-gray-500 mb-2 uppercase">Struktura jednej akcji</div>
                <div className="font-mono text-2xl tracking-widest text-center py-2">
                  <span className="text-blue-400">[nr]</span>
                  <span className="text-yellow-400">[TYP]</span>
                  <span className="text-gray-300">[strefa]</span>
                  <span className="text-green-400">[technika]</span>
                  <span className="text-red-400">[jakość]</span>
                </div>
                <div className="flex justify-center gap-6 text-xs mt-2">
                  <span><span className="text-blue-400 font-bold">niebieski</span> = numer zawodnika (1–99)</span>
                  <span><span className="text-yellow-400 font-bold">żółty</span> = typ akcji</span>
                  <span><span className="text-gray-300 font-bold">szary</span> = strefa (1–6)</span>
                  <span><span className="text-green-400 font-bold">zielony</span> = technika</span>
                  <span><span className="text-red-400 font-bold">czerwony</span> = jakość/wynik</span>
                </div>
              </div>

              <div className="card mb-4 bg-gray-800">
                <div className="text-xs text-gray-500 mb-3 uppercase">Przykład kompletnej wymiany</div>
                <div className="font-mono text-lg text-center py-2 tracking-wider">
                  <span className="text-blue-400">2</span><span className="text-yellow-400">S</span><span className="text-gray-300">2</span><span className="text-green-400">H</span>
                  <span className="text-gray-600"> / </span>
                  <span className="text-blue-400">5</span><span className="text-yellow-400">R</span><span className="text-red-400">+</span>
                  <span className="text-gray-600"> / </span>
                  <span className="text-blue-400">6</span><span className="text-yellow-400">E</span><span className="text-gray-300">3</span><span className="text-green-400">Q</span>
                  <span className="text-gray-600"> / </span>
                  <span className="text-blue-400">10</span><span className="text-yellow-400">A</span><span className="text-gray-300">6</span><span className="text-green-400">H</span><span className="text-red-400">*</span>
                </div>
                <div className="text-gray-400 text-sm text-center mt-2">
                  #2 serwis mocny w strefę 2 → #5 przyjęcie pozytywne → #6 wystawa szybka do strefy 3 → #10 atak mocny w strefę 6, punkt
                </div>
              </div>

              <div className="card bg-yellow-900/20 border-yellow-700">
                <div className="text-yellow-300 font-semibold mb-2">⚠️ Ważne zasady</div>
                <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
                  <li>Duże i małe litery są równoważne — <span className="font-mono">5r+</span> = <span className="font-mono">5R+</span></li>
                  <li>Nie ma spacji w obrębie jednej akcji — <span className="font-mono text-red-400">5 R+</span> to błąd</li>
                  <li>Akcje dzielisz spacją lub ukośnikiem: <span className="font-mono">5R+ 10A6H*</span> lub <span className="font-mono">5R+ / 10A6H*</span></li>
                  <li>Podgląd pod polem kodu pokazuje na bieżąco interpretację</li>
                </ul>
              </div>
            </div>
          )}

          {/* AKCJE */}
          {active === 'akcje' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">🏐 Typy akcji</h2>
              <div className="space-y-3">
                {[
                  { code: 'S', name: 'Serwis', format: '[nr]S[strefa_do][technika][jakość]', desc: 'Zawodnik serwuje. Strefa to strefa boiska przeciwnika do której trafia piłka. Technika: J (jump serve), F (float), H (mocny). Przy asie jakość = #', example: '7SJ#', exampleDesc: '#7 jump serve — as' },
                  { code: 'R', name: 'Przyjęcie', format: '[nr]R[jakość]', desc: 'Przyjęcie serwisu. Strefa jest obliczana automatycznie na podstawie rotacji. Jakość jest kluczowa dla statystyk przyjęcia.', example: '5R#', exampleDesc: '#5 przyjęcie perfekcyjne' },
                  { code: 'E', name: 'Rozegranie (wystawa)', format: '[nr]E[strefa_do][tempo]', desc: 'Rozgrywający wystawia piłkę. Strefa = strefa do której kieruje piłkę. Tempo: Q (szybka/pierwsza), P (pipe/za głową).', example: '4E4Q', exampleDesc: '#4 wystawa szybka do strefy 4' },
                  { code: 'A', name: 'Atak', format: '[nr]A[strefa_do][technika][jakość]', desc: 'Atak przez siatkę. Strefa = strefa boiska przeciwnika do której trafia piłka. Jakość = wynik ataku.', example: '10A1H*', exampleDesc: '#10 atak mocny w strefę 1, punkt' },
                  { code: 'B', name: 'Blok', format: '[nr]B[jakość]', desc: 'Blok przy siatce. Jakość = wynik bloku: * punkt, + zatrzymanie, - odbicie w aut, / błąd bloku.', example: '3B*', exampleDesc: '#3 blok — punkt' },
                  { code: 'D', name: 'Obrona (dig)', format: '[nr]D[jakość]', desc: 'Obrona ataku (dig). Jakość: # lub + dobre, - trudne, / błąd.', example: '1D+', exampleDesc: '#1 obrona pozytywna' },
                  { code: 'K', name: 'Kiwka', format: '[nr]K[strefa_do][jakość]', desc: 'Atak kiwką (dink). Strefa = gdzie trafia piłka.', example: '7K2*', exampleDesc: '#7 kiwka w strefę 2, punkt' },
                  { code: 'F', name: 'Free ball', format: '[nr]F[jakość]', desc: 'Piłka przerzucona przez satkę bez ataku (np. palcami). Jakość jak przy przyjęciu.', example: '5F+', exampleDesc: '#5 free ball pozytywny' },
                ].map(a => (
                  <div key={a.code} className="card">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-yellow-900 flex items-center justify-center font-mono font-bold text-yellow-300 text-xl shrink-0">{a.code}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold text-white">{a.name}</span>
                          <span className="font-mono text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{a.format}</span>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">{a.desc}</p>
                        <div className="flex items-center gap-2">
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

          {/* JAKOŚĆ */}
          {active === 'jakosc' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">⭐ Kody jakości i wyniku</h2>
              <p className="text-gray-400 text-sm mb-6">Jakość akcji to najważniejszy element statystyk. Bezpośrednio wpływa na procent skuteczności.</p>
              <div className="space-y-3">
                {[
                  { code: '#', name: 'Perfekcyjne', color: 'bg-blue-900 text-blue-300', desc: 'Idealne wykonanie. Dla przyjęcia: piłka trafia dokładnie do rozgrywającego, wystawia z miejsca. Dla serwisu: as. Dla ataku: punkt bez kontaktu bloku.' },
                  { code: '+', name: 'Pozytywne', color: 'bg-green-900 text-green-300', desc: 'Dobre wykonanie. Dla przyjęcia: piłka do rozgrywającego, wystawia w ruchu. Dla ataku: punkt, blok odegrany w aut.' },
                  { code: '!', name: 'Overpass / Trudne', color: 'bg-yellow-900 text-yellow-300', desc: 'Przyjęcie lub obrona która trafia za siatkę do przeciwnika (overpass), albo ogólnie trudne wykonanie które utrudnia dalszą grę.' },
                  { code: '-', name: 'Negatywne', color: 'bg-orange-900 text-orange-300', desc: 'Złe wykonanie. Dla przyjęcia: piłka nie trafia do rozgrywającego, gra jest utrudniona. Dla ataku: piłka obroniona przez przeciwnika.' },
                  { code: '/', name: 'Błąd', color: 'bg-red-900 text-red-300', desc: 'Bezpośredni błąd — utrata punktu. Piłka w siatce, na aut, błąd serwisu, atak zablokowany w punkt.' },
                  { code: '*', name: 'Punkt bezpośredni', color: 'bg-emerald-900 text-emerald-300', desc: 'Akcja kończy się zdobyciem punktu bezpośrednio. Używane dla: asa serwisowego, ataku kończącego, bloku punktowego, kiwki.' },
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
              <div className="card mt-6 bg-gray-800">
                <div className="text-sm font-semibold text-white mb-3">Jak liczy się skuteczność?</div>
                <div className="font-mono text-sm text-gray-300 mb-2">skuteczność = (perfekcyjne + pozytywne) / wszystkie × 100%</div>
                <div className="text-xs text-gray-500">Przykład: 3× # + 4× + + 2× - + 1× / = 70% skuteczności przyjęcia</div>
              </div>
            </div>
          )}

          {/* TECHNIKA */}
          {active === 'technika' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">💪 Kody techniki</h2>
              <p className="text-gray-400 text-sm mb-6">Technika opisuje sposób wykonania akcji. Używana głównie przy serwisach i atakach.</p>
              <div className="space-y-3">
                {[
                  { code: 'H', name: 'Mocny (Hard)', akcje: 'Atak, Serwis', desc: 'Mocne uderzenie z pełną siłą. Najczęściej używany przy atakach z wyskoku i powerowych serwisach.' },
                  { code: 'T', name: 'Topspin / Liniowy', akcje: 'Atak', desc: 'Atak ze spinową rotacją piłki lub atak liniowy wzdłuż linii bocznej.' },
                  { code: 'Q', name: 'Szybka (Quick)', akcje: 'Rozegranie', desc: 'Szybka wystawa — piłka wystawiona krótko i nisko, atakujący uderza w maksymalnym wyskoku tuż za dłońmi rozgrywającego (tzw. jedynka/dwójka).' },
                  { code: 'P', name: 'Pipe / Planowany', akcje: 'Rozegranie, Atak', desc: 'Atak ze środka boiska (pozycja 6) lub planowany atak — zawodnik atakuje z rozbiegu z głębi boiska.' },
                  { code: 'J', name: 'Jump serve', akcje: 'Serwis', desc: 'Serwis z wyskoku (jump serve) — zawodnik rozbiega się i serwuje w wyskoku jak przy ataku. Najgroźniejszy rodzaj serwisu.' },
                  { code: 'F', name: 'Float serve', akcje: 'Serwis', desc: 'Serwis bez rotacji (float) — piłka leci bez spinowania, co powoduje nieprzewidywalny lot. Wymaga precyzji.' },
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

          {/* STREFY */}
          {active === 'strefy' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">🗺️ Strefy boiska</h2>
              <p className="text-gray-400 text-sm mb-6">Boisko podzielone jest na 6 stref zgodnie z numeracją FIVB. Numery stref są kluczowe przy kodowaniu ataków i serwisów.</p>

              <div className="flex gap-8 flex-wrap">
                {/* Court diagram */}
                <div>
                  <div className="text-sm text-gray-400 mb-2 text-center">Widok boiska (od strony drużyny)</div>
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
                  <div className="text-xs text-gray-600 mt-2 text-center">← lewa strona | prawa strona →</div>
                </div>

                {/* Zone descriptions */}
                <div className="flex-1">
                  <div className="space-y-2 text-sm">
                    {[
                      { z: 1, name: 'Prawy tył', pos: 'Pozycja serwisowa (rotacja 1). Libero lub przyjmujący.' },
                      { z: 2, name: 'Prawy przód', pos: 'Przy siatce po prawej. Atakujący lub przyjmujący z prawej.' },
                      { z: 3, name: 'Środek przód', pos: 'Środek przy siatce. Rozgrywający lub środkowy.' },
                      { z: 4, name: 'Lewy przód', pos: 'Przy siatce po lewej. Główna pozycja atakująca.' },
                      { z: 5, name: 'Lewy tył', pos: 'Tył po lewej. Przyjmujący lub libero.' },
                      { z: 6, name: 'Środek tył', pos: 'Środek tyłu boiska. Libero lub zawodnik obronny.' },
                    ].map(z => (
                      <div key={z.z} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center font-bold text-white shrink-0">{z.z}</div>
                        <div>
                          <span className="font-medium text-white">{z.name}</span>
                          <span className="text-gray-500"> — {z.pos}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="card mt-4 bg-blue-900/20 border-blue-700">
                    <div className="text-blue-300 font-semibold mb-2 text-sm">💡 Jak używać stref w kodzie?</div>
                    <ul className="text-gray-300 text-xs space-y-1 list-disc list-inside">
                      <li><strong>Serwis:</strong> strefa = gdzie ląduje piłka na boisku przeciwnika</li>
                      <li><strong>Atak:</strong> strefa = gdzie ląduje piłka na boisku przeciwnika</li>
                      <li><strong>Rozegranie:</strong> strefa = skąd atakuje zawodnik</li>
                      <li><strong>Przyjęcie:</strong> strefa wyliczana automatycznie z rotacji</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PRZYKŁADY */}
          {active === 'przyklady' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">📋 Przykłady kompletnych wymian</h2>
              <div className="space-y-4">
                {[
                  {
                    title: 'Prosta wymiana z punktem po ataku',
                    code: '2S2H / 5R+ / 6E4Q / 10A6H*',
                    steps: [
                      { code: '2S2H', desc: '#2 serwis mocny (H) w strefę 2' },
                      { code: '5R+', desc: '#5 przyjęcie pozytywne' },
                      { code: '6E4Q', desc: '#6 wystawa szybka (Q) do strefy 4' },
                      { code: '10A6H*', desc: '#10 atak mocny (H) w strefę 6, punkt (*)' },
                    ]
                  },
                  {
                    title: 'As serwisowy',
                    code: '7SJ#',
                    steps: [
                      { code: '7SJ#', desc: '#7 jump serve (J), as (#)' },
                    ]
                  },
                  {
                    title: 'Punkt po bloku',
                    code: '3S5F- / 11R- / 4E3Q / 9A4T+ / 14B*',
                    steps: [
                      { code: '3S5F-', desc: '#3 float serve (F) w strefę 5, negatywny (-)' },
                      { code: '11R-', desc: '#11 przyjęcie negatywne' },
                      { code: '4E3Q', desc: '#4 wystawa szybka do strefy 3' },
                      { code: '9A4T+', desc: '#9 atak liniowy (T) w strefę 4, zatrzymany' },
                      { code: '14B*', desc: '#14 blok — punkt (*)' },
                    ]
                  },
                  {
                    title: 'Atak zablokowany, obrona, kontratak',
                    code: '2S1F+ / 5R# / 6E2Q / 10A5H- / 3D+ / 7E4P / 10A6H*',
                    steps: [
                      { code: '2S1F+', desc: '#2 float serve w strefę 1, pozytywny' },
                      { code: '5R#', desc: '#5 przyjęcie perfekcyjne' },
                      { code: '6E2Q', desc: '#6 wystawa szybka do strefy 2' },
                      { code: '10A5H-', desc: '#10 atak mocny w strefę 5, piłka obroniona' },
                      { code: '3D+', desc: '#3 obrona pozytywna' },
                      { code: '7E4P', desc: '#7 wystawa planowana (pipe) do strefy 4' },
                      { code: '10A6H*', desc: '#10 atak mocny w strefę 6, punkt' },
                    ]
                  },
                  {
                    title: 'Błąd serwisu (koniec wymiany jedną akcją)',
                    code: '8S/',
                    steps: [
                      { code: '8S/', desc: '#8 serwis — błąd (/) punkt dla przeciwnika' },
                    ]
                  },
                ].map((ex, i) => (
                  <div key={i} className="card">
                    <div className="font-semibold text-white mb-3">{ex.title}</div>
                    <div className="font-mono text-base bg-gray-800 rounded-lg px-4 py-2 mb-3 text-green-400 tracking-wide">
                      {ex.code}
                    </div>
                    <div className="space-y-1.5">
                      {ex.steps.map((s, si) => (
                        <div key={si} className="flex items-center gap-3 text-sm">
                          <span className="font-mono text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded w-24 text-center shrink-0">{s.code}</span>
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
