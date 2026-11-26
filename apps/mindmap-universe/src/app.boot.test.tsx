import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '@/App'

describe('app boot', () => {
  it('reaches the workspace without update loops', async () => {
    window.location.hash = '#universe'
    const { container } = render(<App />)
    await waitFor(() => {
      expect(screen.queryByText('Opening your universe…')).toBeNull()
    }, { timeout: 5000 })
    expect(screen.queryByText(/failed to start/i)).toBeNull()
    expect(container.textContent).toContain('My Knowledge')
    await new Promise((r) => setTimeout(r, 300))
  })
})
