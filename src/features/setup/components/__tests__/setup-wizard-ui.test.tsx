import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SetupWizard } from '../setup-wizard';
import { SetupProgress } from '../setup-progress';
import { ServiceHealthStep } from '../service-health-step';
import { AdminAccountStep } from '../admin-account-step';
import { InstanceConfigStep } from '../instance-config-step';
import { FirstWorkspaceStep } from '../first-workspace-step';
import { SampleDataStep } from '../sample-data-step';
import { SetupScreen } from '../../screens/setup-screen';
import type { UseSetupWizardReturn } from '../../hooks';

const mockUseInstanceStatus = vi.fn();
const mockUseSetupWizard = vi.fn();
const mockUseServiceHealth = vi.fn();
const mockUseCreateAdmin = vi.fn();
const mockUseSaveInstanceConfig = vi.fn();
const mockUseCreateFirstWorkspace = vi.fn();
const mockUseWorkspaceMode = vi.fn();
const mockUseCompleteSetup = vi.fn();
const mockPush = vi.fn();

vi.mock('../../hooks', () => ({
  useInstanceStatus: () => mockUseInstanceStatus(),
  useSetupWizard: (...args: unknown[]) => mockUseSetupWizard(...args),
  useServiceHealth: () => mockUseServiceHealth(),
  useCreateAdmin: () => mockUseCreateAdmin(),
  useSaveInstanceConfig: () => mockUseSaveInstanceConfig(),
  useCreateFirstWorkspace: () => mockUseCreateFirstWorkspace(),
  useWorkspaceMode: () => mockUseWorkspaceMode(),
  useCompleteSetup: () => mockUseCompleteSetup(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const createWizardStub = (): UseSetupWizardReturn =>
  ({
    currentStep: 'health-check',
    completedSteps: [],
    adminData: null,
    instanceData: null,
    workspaceData: {
      id: 'workspace-1',
      name: 'Workspace',
      slug: 'workspace',
    },
    includeSampleData: false,
    steps: [],
    progress: { current: 1, total: 5, percentage: 20 },
    canGoBack: true,
    canGoForward: true,
    goToStep: vi.fn(),
    goToNextStep: vi.fn(),
    goToPreviousStep: vi.fn(),
    setAdminData: vi.fn(),
    setInstanceData: vi.fn(),
    setWorkspaceData: vi.fn(),
    setIncludeSampleData: vi.fn(),
    markStepComplete: vi.fn(),
    resetWizard: vi.fn(),
    isStepComplete: vi.fn(),
  }) as unknown as UseSetupWizardReturn;

beforeEach(() => {
  mockUseInstanceStatus.mockReturnValue({
    data: null,
    isLoading: true,
    error: null,
  });
  mockUseSetupWizard.mockReturnValue(createWizardStub());
  mockUseServiceHealth.mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  mockUseCreateAdmin.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  });
  mockUseSaveInstanceConfig.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  });
  mockUseCreateFirstWorkspace.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  });
  mockUseWorkspaceMode.mockReturnValue({ isMultiWorkspaceMode: true });
  mockUseCompleteSetup.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  });
});

describe('SetupScreen', () => {
  it('uses balanced text wrapping for the hero heading', () => {
    render(<SetupScreen />);

    const heading = screen.getByRole('heading', {
      name: /welcome to ui syncup/i,
    });
    expect(heading).toHaveClass('text-balance');
  });
});

describe('SetupWizard loading and redirect states', () => {
  it('uses ellipsis and reduced-motion spinner in loading state', () => {
    mockUseInstanceStatus.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { container } = render(<SetupWizard />);

    expect(
      screen.getByText('Checking setup status\u2026')
    ).toBeInTheDocument();
    const spinner = container.querySelector('svg');
    expect(spinner).toHaveClass('motion-reduce:animate-none');
  });

  it('uses ellipsis and reduced-motion spinner when redirecting', () => {
    mockUseInstanceStatus.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    mockUseSetupWizard.mockReturnValue({
      ...createWizardStub(),
      currentStep: 'complete',
    });

    const { container } = render(<SetupWizard />);

    expect(screen.getByText('Redirecting\u2026')).toBeInTheDocument();
    const spinner = container.querySelector('svg');
    expect(spinner).toHaveClass('motion-reduce:animate-none');
  });
});

describe('SetupProgress', () => {
  it('animates width only and disables motion when requested', () => {
    const { container } = render(
      <SetupProgress currentStep="health-check" />
    );

    const bar = container.querySelector('div[style*="width"]');
    expect(bar).toHaveClass('transition-[width]');
    expect(bar).toHaveClass('motion-reduce:transition-none');
    expect(bar).not.toHaveClass('transition-all');
  });
});

describe('ServiceHealthStep', () => {
  it('uses balanced heading text and a next-step action label', () => {
    mockUseServiceHealth.mockReturnValue({
      data: {
        database: { status: 'connected', message: 'Connected' },
        email: {
          status: 'connected',
          message: 'Connected',
          degradedBehavior: '',
        },
        storage: {
          status: 'connected',
          message: 'Connected',
          degradedBehavior: '',
        },
        redis: {
          status: 'connected',
          message: 'Connected',
          degradedBehavior: '',
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ServiceHealthStep wizard={createWizardStub()} />);

    const heading = screen.getByRole('heading', {
      name: /system health check/i,
    });
    expect(heading).toHaveClass('text-balance');
    expect(
      screen.getByRole('button', {
        name: /continue to create admin account/i,
      })
    ).toBeInTheDocument();
  });

  it('applies reduced-motion overrides to loading spinners', () => {
    mockUseServiceHealth.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    const { container } = render(
      <ServiceHealthStep wizard={createWizardStub()} />
    );

    const spinners = container.querySelectorAll('svg.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
    spinners.forEach((spinner) => {
      expect(spinner).toHaveClass('motion-reduce:animate-none');
    });
  });
});

describe('AdminAccountStep', () => {
  it('adds balanced heading text and form autofill metadata', () => {
    render(<AdminAccountStep wizard={createWizardStub()} />);

    expect(
      screen.getByRole('heading', { name: /create admin account/i })
    ).toHaveClass('text-balance');

    const displayName = screen.getByLabelText('Display Name');
    expect(displayName).toHaveAttribute('autocomplete', 'off');
    expect(displayName).toHaveAttribute('placeholder', 'John Doe\u2026');

    const email = screen.getByLabelText('Email Address');
    expect(email).toHaveAttribute('autocomplete', 'email');
    expect(email).toHaveAttribute('inputmode', 'email');
    expect(email).toHaveAttribute('spellcheck', 'false');
    expect(email).toHaveAttribute(
      'placeholder',
      'admin@example.com\u2026'
    );

    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('autocomplete', 'new-password');

    const confirmPassword = screen.getByLabelText('Confirm Password');
    expect(confirmPassword).toHaveAttribute('autocomplete', 'new-password');
  });

  it('disables motion for the submit spinner', () => {
    mockUseCreateAdmin.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      error: null,
    });

    const { container } = render(<AdminAccountStep wizard={createWizardStub()} />);
    const spinner = container.querySelector('svg.animate-spin');
    expect(spinner).toHaveClass('motion-reduce:animate-none');
  });
});

describe('InstanceConfigStep', () => {
  it('adds balanced heading text and form autofill metadata', () => {
    render(<InstanceConfigStep wizard={createWizardStub()} />);

    expect(
      screen.getByRole('heading', { name: /instance configuration/i })
    ).toHaveClass('text-balance');

    const instanceName = screen.getByLabelText('Instance Name');
    expect(instanceName).toHaveAttribute('autocomplete', 'off');
    expect(instanceName).toHaveAttribute('placeholder', 'My Company\u2026');

  });

  it('disables motion for the submit spinner', () => {
    mockUseSaveInstanceConfig.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      error: null,
    });

    const { container } = render(
      <InstanceConfigStep wizard={createWizardStub()} />
    );
    const spinner = container.querySelector('svg.animate-spin');
    expect(spinner).toHaveClass('motion-reduce:animate-none');
  });
});

describe('FirstWorkspaceStep', () => {
  it('adds balanced heading text and form autofill metadata', () => {
    render(<FirstWorkspaceStep wizard={createWizardStub()} />);

    expect(
      screen.getByRole('heading', { name: /create first workspace/i })
    ).toHaveClass('text-balance');

    const workspaceName = screen.getByLabelText('Workspace Name');
    expect(workspaceName).toHaveAttribute('autocomplete', 'off');
    expect(workspaceName).toHaveAttribute(
      'placeholder',
      'Engineering Team\u2026'
    );
  });

  it('disables motion for the submit spinner', () => {
    mockUseCreateFirstWorkspace.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      error: null,
    });

    const { container } = render(
      <FirstWorkspaceStep wizard={createWizardStub()} />
    );
    const spinner = container.querySelector('svg.animate-spin');
    expect(spinner).toHaveClass('motion-reduce:animate-none');
  });
});

describe('SampleDataStep', () => {
  it('adds balanced heading text for the final step', () => {
    render(<SampleDataStep wizard={createWizardStub()} />);

    expect(
      screen.getByRole('heading', { name: /finalize setup/i })
    ).toHaveClass('text-balance');
  });

  it('disables motion for the submit spinner', () => {
    mockUseCompleteSetup.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      error: null,
    });

    const { container } = render(<SampleDataStep wizard={createWizardStub()} />);
    const spinner = container.querySelector('svg.animate-spin');
    expect(spinner).toHaveClass('motion-reduce:animate-none');
  });
});

describe('SampleDataStep redirect', () => {
  beforeEach(() => mockPush.mockReset());

  it('redirects to /projects on success when no redirectUrl returned', () => {
    mockUseCompleteSetup.mockReturnValue({
      mutate: (_data: unknown, opts: { onSuccess: (d: { redirectUrl?: string }) => void }) => {
        opts.onSuccess({}); // no redirectUrl in response
      },
      isPending: false,
      error: null,
    });

    const wizard = { ...createWizardStub(), workspaceData: { id: 'ws-1', name: 'Test', slug: 'test' } };
    render(<SampleDataStep wizard={wizard} />);
    fireEvent.click(screen.getByRole('button', { name: /complete setup/i }));

    expect(mockPush).toHaveBeenCalledWith('/projects');
  });
});
