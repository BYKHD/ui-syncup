"use client"

import { useState, useEffect, useCallback } from 'react'
import type { Project } from '@/components/shared/sidebar/type'

const STORAGE_KEY = 'syncup:recent-projects'
const MAX_RECENT_PROJECTS = 5

export function useRecentProjects() {
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setRecentProjects(JSON.parse(stored))
      }
    } catch (error) {
      console.warn('Failed to load recent projects from localStorage', error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save to localStorage whenever list changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recentProjects))
      } catch (error) {
        console.warn('Failed to save recent projects to localStorage', error)
      }
    }
  }, [recentProjects, isLoaded])

  const addRecentProject = useCallback((project: Project) => {
    setRecentProjects((prev) => {
      // Remove existing if present to move it to top
      const filtered = prev.filter((p) => p.id !== project.id)
      // Add to front and limit size
      return [project, ...filtered].slice(0, MAX_RECENT_PROJECTS)
    })
  }, [])

  const clearRecentProjects = useCallback(() => {
    setRecentProjects([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    recentProjects,
    addRecentProject,
    clearRecentProjects,
    isLoaded,
  }
}
