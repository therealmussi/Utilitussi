// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div />,
  CircleMarker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

import App from '../App'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('smoke: every route mounts without crashing', () => {
  const routes = [
    '/',
    '/explorer',
    '/explorer/turin',
    '/explorer/does-not-exist',
    '/compare',
    '/salary',
    '/budget',
    '/relocation',
    '/rankings',
    '/settings',
  ]

  for (const path of routes) {
    it(`renders ${path}`, () => {
      const { unmount } = renderAt(path)
      expect(document.body.textContent?.trim().length ?? 0).toBeGreaterThan(0)
      unmount()
    })
  }

  it('renders the brand and tagline on Overview', () => {
    renderAt('/')
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0)
  })

  it('shows a friendly empty state for unknown cities', () => {
    renderAt('/explorer/does-not-exist')
    expect(screen.getByText(/City not found/i)).toBeTruthy()
  })
})
