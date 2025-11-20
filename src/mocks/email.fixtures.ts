import { EmailTemplate } from '@/server/email/render-template';

export const MOCK_EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  welcome: {
    type: 'welcome',
    data: {
      name: 'Alex Johnson',
      dashboardUrl: 'http://localhost:3000/dashboard',
    },
  },
  verification: {
    type: 'verification',
    data: {
      name: 'Alex Johnson',
      verificationUrl: 'http://localhost:3000/verify-email?token=abc123xyz',
    },
  },
  password_reset: {
    type: 'password_reset',
    data: {
      name: 'Alex Johnson',
      resetUrl: 'http://localhost:3000/reset-password?token=reset123',
    },
  },
  security_alert_password: {
    type: 'security_alert',
    data: {
      name: 'Alex Johnson',
      alertType: 'password_changed',
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.1',
      location: 'San Francisco, CA',
      device: 'Chrome on macOS',
      actionUrl: 'http://localhost:3000/settings/security',
    },
  },
  security_alert_signin: {
    type: 'security_alert',
    data: {
      name: 'Alex Johnson',
      alertType: 'new_signin',
      timestamp: new Date().toISOString(),
      ipAddress: '10.0.0.1',
      location: 'New York, NY',
      device: 'Firefox on Windows',
      actionUrl: 'http://localhost:3000/settings/security',
    },
  },
  security_alert_suspicious: {
    type: 'security_alert',
    data: {
      name: 'Alex Johnson',
      alertType: 'suspicious_activity',
      timestamp: new Date().toISOString(),
      ipAddress: '45.33.22.11',
      location: 'Unknown',
      device: 'Unknown Device',
      actionUrl: 'http://localhost:3000/settings/security',
    },
  },
};
