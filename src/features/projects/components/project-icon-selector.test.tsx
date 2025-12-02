import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProjectIconSelector } from './project-icon-selector'

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

describe('ProjectIconSelector', () => {
  it('renders trigger button with selected icon', () => {
    render(<ProjectIconSelector value="RiFolderFill" onChange={() => {}} />)
    const triggerButton = screen.getByRole('combobox')
    expect(triggerButton).toBeInTheDocument()
  })

  it('opens popover and shows command input when trigger is clicked', async () => {
    render(<ProjectIconSelector value="RiFolderFill" onChange={() => {}} />)
    
    const triggerButton = screen.getByRole('combobox')
    fireEvent.click(triggerButton)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search icons...')).toBeInTheDocument()
    })
  })

  it('calls onChange and closes popover when an icon is selected', async () => {
    const handleChange = vi.fn()
    render(<ProjectIconSelector value="RiFolderFill" onChange={handleChange} />)
    
    const triggerButton = screen.getByRole('combobox')
    fireEvent.click(triggerButton)
    
    await waitFor(() => {
      expect(screen.getByTitle('Rocket')).toBeInTheDocument()
    })
    
    const rocketIcon = screen.getByTitle('Rocket')
    fireEvent.click(rocketIcon)
    
    expect(handleChange).toHaveBeenCalledWith('RiRocketFill')
  })
})
