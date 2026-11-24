import { useEffect } from 'react'
import { Routes, Route, Outlet, useLocation } from 'react-router-dom'
import { Sidebar, ThemeEffect, DesktopFooter } from './components/layout'
import { fetchLiveRates } from './lib/currency'
import { useAppStore } from './store/useAppStore'
import Overview from './pages/Overview'
import CityExplorer from './pages/CityExplorer'
import CityProfile from './pages/CityProfile'
import Compare from './pages/Compare'
import SalarySimulator from './pages/SalarySimulator'
import Budget from './pages/Budget'
import RelocationPlanner from './pages/RelocationPlanner'
import Rankings from './pages/Rankings'
import Settings from './pages/Settings'

function Shell() {
  return (
    <div className="min-h-screen md:pl-64">
      <Sidebar />
      <ThemeEffect />
      <main className="mx-auto max-w-6xl px-4 pb-6 pt-20 sm:px-6 md:pt-8">
        <Outlet />
        <DesktopFooter />
      </main>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const setRates = useAppStore((s) => s.setRates)

  useEffect(() => {
    let active = true
    fetchLiveRates()
      .then((r) => {
        if (active) setRates(r)
      })
      .catch(() => {
        /* keep bundled fallback; header and footer expose the FX status */
      })
    return () => {
      active = false
    }
  }, [setRates])

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Overview />} />
          <Route path="/explorer" element={<CityExplorer />} />
          <Route path="/explorer/:cityId" element={<CityProfile />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/salary" element={<SalarySimulator />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/relocation" element={<RelocationPlanner />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="*"
            element={
              <div className="panel panel-pad mt-6">
                <h1 className="heading-h1 text-negative">404</h1>
                <p className="mt-2 muted">This page does not exist.</p>
              </div>
            }
          />
        </Route>
      </Routes>
    </>
  )
}
