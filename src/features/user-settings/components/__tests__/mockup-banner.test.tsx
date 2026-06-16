import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MockupBanner } from '../mockup-banner'

describe('MockupBanner', () => {
  test('renders the mockup preview notice', () => {
    render(<MockupBanner />)
    expect(screen.getByText('Mockup Preview')).toBeInTheDocument()
  })
})
