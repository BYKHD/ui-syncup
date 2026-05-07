import { expect, test, type BrowserContext } from '@playwright/test';
import { createAuthenticatedSession } from './helpers/auth-helpers';
import {
  createAccessRequestFlowFixture,
  createTestSession,
  deleteAccessRequestFlowFixture,
  type AccessRequestFlowFixture,
} from './helpers/test-fixtures';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${process.env.PORT ?? '3000'}`;

async function loginAs(
  context: BrowserContext,
  userId: string,
  teamId: string | null = null
): Promise<void> {
  const sessionToken = await createTestSession(userId);
  await createAuthenticatedSession(context, sessionToken, BASE_URL);

  await context.addCookies([
    {
      name: 'setup-complete',
      value: '1',
      url: BASE_URL,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
    ...(teamId
      ? [
          {
            name: 'team_id',
            value: teamId,
            url: BASE_URL,
            httpOnly: true,
            secure: false,
            sameSite: 'Lax' as const,
          },
        ]
      : []),
  ]);
}

test('non-member requests access from issue link -> approver approves -> requester sees issue', async ({
  browser,
}, testInfo) => {
  const suffix = `${testInfo.project.name}-${testInfo.workerIndex}-${Date.now()}`;
  let fixture: AccessRequestFlowFixture | null = null;
  let ownerCtx: BrowserContext | null = null;
  let requesterCtx: BrowserContext | null = null;

  try {
    fixture = await createAccessRequestFlowFixture(suffix);

    ownerCtx = await browser.newContext();
    requesterCtx = await browser.newContext();

    await loginAs(ownerCtx, fixture.owner.id, fixture.team.id);
    await loginAs(requesterCtx, fixture.requester.id);

    const ownerPage = await ownerCtx.newPage();
    const requesterPage = await requesterCtx.newPage();
    const issueUrl = `/issue/${fixture.issue.issueKey}`;

    await requesterPage.goto(issueUrl);
    await expect(requesterPage.getByText(`Request access to ${fixture.project.name}`)).toBeVisible({
      timeout: 30_000,
    });
    await requesterPage.getByPlaceholder('Add a note (optional)').fill('e2e test');
    await requesterPage.getByRole('button', { name: 'Request access' }).click();
    await expect(requesterPage.getByText('Request pending')).toBeVisible();

    await ownerPage.goto(`/${fixture.project.slug}`);
    await expect(ownerPage.getByText(fixture.project.name).first()).toBeVisible();
    await ownerPage.getByRole('button', { name: 'More actions' }).click();
    await ownerPage.getByRole('menuitem', { name: 'Members' }).click();
    await expect(ownerPage.getByRole('dialog', { name: 'Project Members' })).toBeVisible();
    await expect(ownerPage.getByText('Access requests (1)')).toBeVisible();
    await expect(ownerPage.getByText(fixture.requester.email)).toBeVisible();
    await ownerPage.getByRole('button', { name: 'Approve' }).click();
    await expect(ownerPage.getByText('Access granted.')).toBeVisible();

    await requesterPage.reload();
    await expect(
      requesterPage.getByRole('main', { name: `Issue ${fixture.issue.issueKey} details` })
    ).toBeVisible();
    await expect(requesterPage.getByText(fixture.issue.title).first()).toBeVisible();
  } finally {
    await ownerCtx?.close();
    await requesterCtx?.close();

    if (fixture) {
      await deleteAccessRequestFlowFixture(fixture);
    }
  }
});
