import { useState } from 'react'
import Scorekeeper from './Scorekeeper.jsx'
import OnlineApp from './online/OnlineApp.jsx'

export default function App() {
  const [mode, setMode] = useState('home')

  if (mode === 'scorekeeper') {
    return <Scorekeeper onBack={() => setMode('home')} />
  }

  if (mode === 'online') {
    return <OnlineApp onBack={() => setMode('home')} />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-emerald-900">Call Break</h1>
          <p className="mt-2 text-sm text-slate-600">Scorekeeper and online play for 4 players</p>
        </header>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setMode('online')}
            className="w-full rounded-xl bg-emerald-700 px-4 py-4 text-left text-white transition hover:bg-emerald-600"
          >
            <div className="font-semibold">Play Online</div>
            <div className="mt-1 text-sm text-emerald-100">
              Create a room, invite friends, play cards, and talk live
            </div>
          </button>
          <p className="text-center text-xs text-slate-500">
            Online play requires the full server (npm start), not the static-only link.
          </p>

          <button
            type="button"
            onClick={() => setMode('scorekeeper')}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
          >
            <div className="font-semibold text-slate-800">Scorekeeper</div>
            <div className="mt-1 text-sm text-slate-500">
              Track calls and scores manually at the table
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
