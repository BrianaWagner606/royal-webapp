// frontend/src/App.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'
import '@testing-library/jest-dom' // Adds special matchers like "toBeInTheDocument"

// 1. MOCK THE BACKEND (The Fake Signal)
// We tell the test: "If the App asks for data, just give it this fake stuff."
global.fetch = vi.fn()

function createFetchResponse(data) {
    return { 
        ok: true, 
        json: () => new Promise((resolve) => resolve(data)) 
    }
}

describe('App Component', () => {
    beforeEach(() => {
        // Reset the fake backend before every test
        fetch.mockResolvedValue(createFetchResponse({ status: "Test Mode" }))
    })

    it('renders the main title', async () => {
        // 2. RENDER THE APP
        render(<App />)

        // 3. CHECK THE SCREEN
        // We look for "Zombies Like Brains"
        // We use 'waitFor' because the app might take a millisecond to load
        await waitFor(() => {
            expect(screen.getByText(/Zombies Like Brains/i)).toBeInTheDocument()
        })
    })

    it('shows the battle button when wall health is high', async () => {
        render(<App />)

        // Check if the "SURVIVE THE NIGHT" button exists
        await waitFor(() => {
            expect(screen.getByText(/SURVIVE THE NIGHT/i)).toBeInTheDocument()
        })
    })
})