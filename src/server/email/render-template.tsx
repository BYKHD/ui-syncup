import { render } from '@react-email/render';
import { VerificationEmail } from './templates/verification-email';
import { PasswordResetEmail } from './templates/password-reset-email';
import { WelcomeEmail } from './templates/welcome-email';
import { SecurityAlertEmail } from './templates/security-alert-email';
import { TeamInvitationEmail } from './templates/team-invitation-email';
import { OwnershipTransferEmail } from './templates/ownership-transfer-email';

/**
 * Template types and their corresponding data structures
 */
export type EmailTemplate = 
  | { type: 'verification'; data: { name: string; verificationUrl: string } }
  | { type: 'password_reset'; data: { name: string; resetUrl: string } }
  | { type: 'welcome'; data: { name: string; dashboardUrl: string } }
  | { type: 'security_alert'; data: { 
      name: string; 
      alertType: 'password_changed' | 'new_signin' | 'suspicious_activity';
      timestamp: string;
      ipAddress?: string;
      location?: string;
      device?: string;
      actionUrl?: string;
    }}
  | { type: 'team_invitation'; data: {
      inviterName: string;
      teamName: string;
      invitationUrl: string;

      expiresIn: string;
    }}
  | { type: 'ownership_transfer'; data: {
      teamName: string;
      previousOwnerName: string;
      newOwnerName: string;
      isNewOwner: boolean;
      teamUrl: string;
    }};

/**
 * Render email template to HTML string
 * 
 * @param template - Template type and data
 * @returns HTML string ready to send via email service
 */
export async function renderTemplate(template: EmailTemplate): Promise<string> {
  let component: React.ReactElement;

  switch (template.type) {
    case 'verification':
      component = <VerificationEmail {...template.data} />;
      break;
    case 'password_reset':
      component = <PasswordResetEmail {...template.data} />;
      break;
    case 'welcome':
      component = <WelcomeEmail {...template.data} />;
      break;
    case 'security_alert':
      component = <SecurityAlertEmail {...template.data} />;
      break;
    case 'team_invitation':
      component = <TeamInvitationEmail {...template.data} />;
      break;
    case 'ownership_transfer':
      component = <OwnershipTransferEmail {...template.data} />;
      break;
    default:
      throw new Error(`Unknown template type: ${(template as any).type}`);
  }

  return await render(component);
}

/**
 * Get email subject based on template type
 */
export function getEmailSubject(template: EmailTemplate): string {
  switch (template.type) {
    case 'verification':
      return 'Verify your email address - UI SyncUp';
    case 'password_reset':
      return 'Reset your password - UI SyncUp';
    case 'welcome':
      return 'Welcome to UI SyncUp!';
    case 'security_alert':
      const alertType = template.data.alertType;
      if (alertType === 'password_changed') {
        return 'Your password was changed - UI SyncUp';
      } else if (alertType === 'new_signin') {
        return 'New sign-in to your account - UI SyncUp';
      } else {
        return 'Security alert for your account - UI SyncUp';
      }
    case 'team_invitation':
      return `Join ${template.data.teamName} on UI SyncUp`;
    case 'ownership_transfer':
      return `Ownership transfer for ${template.data.teamName} - UI SyncUp`;
    default:
      return 'UI SyncUp Notification';
  }
}
