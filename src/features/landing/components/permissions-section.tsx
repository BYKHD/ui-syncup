"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { SectionContainer } from "@/components/shared/section-container"

/**
 * Permissions section: showcases team/project hierarchy and role-based access
 */
export function PermissionsSection() {
  return (
    <SectionContainer id="permissions">
      <div className="space-y-12">
        {/* Section header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Multi-team, multi-project, clear permissions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Organize work by team and project with fine-grained role-based access control
          </p>
        </div>

        {/* Hierarchy visualization and role descriptions */}
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-[1.2fr,1fr] items-start">
            {/* Left: Visual hierarchy */}
            <Card>
              <CardContent className="p-8">
                <div className="space-y-8">
                  {/* Team level */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-lg">Team Level</div>
                        <div className="text-sm text-muted-foreground">
                          Design Squad
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">Owner</Badge>
                      <Badge variant="outline">Admin</Badge>
                      <Badge variant="outline">Editor</Badge>
                    </div>
                  </div>

                  <div className="pl-6 border-l-2 border-border space-y-6">
                    {/* Projects */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-4 h-4"
                            >
                              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium">Project Level</div>
                            <div className="text-sm text-muted-foreground">
                              Marketing Site
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary">Owner</Badge>
                          <Badge variant="secondary">Editor</Badge>
                          <Badge variant="secondary">Developer</Badge>
                          <Badge variant="secondary">Viewer</Badge>
                        </div>
                      </div>

                      <div className="pl-6 border-l-2 border-border">
                        {/* Issues */}
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-4 h-4"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium">Issues</div>
                            <div className="text-sm text-muted-foreground">
                              Scoped to project visibility
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Role descriptions */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">Role Permissions</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Fine-grained access control for teams and projects
              </p>
            </div>

            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3">Team Roles</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>Owner/Admin:</strong> Manage team settings and members
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>Editor:</strong> Create projects, invite members
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3">Project Roles</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>Developer:</strong> Update issues, add comments (free, unlimited)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>Viewer:</strong> Read-only access to issues (free, unlimited)
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  )
}
