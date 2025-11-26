import { describe, it, expect } from 'vitest';
import { renderTemplate, getEmailSubject } from '../render-template';

describe('Email Template Rendering', () => {
  describe('renderTemplate', () => {
    it('should render verification email template', async () => {
      const html = await renderTemplate({
        type: 'verification',
        data: {
          name: 'John Doe',
          verificationUrl: 'https://example.com/verify?token=abc123',
        },
      });

      expect(html).toContain('John Doe');
      expect(html).toContain('https://example.com/verify?token=abc123');
      expect(html).toContain('Verify Email Address');
      expect(html).toContain('Welcome to <strong>UI SyncUp</strong>!');
    });

    it('should render password reset email template', async () => {
      const html = await renderTemplate({
        type: 'password_reset',
        data: {
          name: 'Jane Smith',
          resetUrl: 'https://example.com/reset?token=xyz789',
        },
      });

      expect(html).toContain('Jane Smith');
      expect(html).toContain('https://example.com/reset?token=xyz789');
      expect(html).toContain('Reset Password');
      expect(html).toContain('Reset Your Password');
    });

    it('should render welcome email template', async () => {
      const html = await renderTemplate({
        type: 'welcome',
        data: {
          name: 'Alice Johnson',
          dashboardUrl: 'https://example.com/dashboard',
        },
      });

      expect(html).toContain('Alice Johnson');
      expect(html).toContain('https://example.com/dashboard');
      expect(html).toContain('Go to Dashboard');
      expect(html).toContain('Welcome to UI SyncUp!');
    });

    it('should render security alert email template for password change', async () => {
      const html = await renderTemplate({
        type: 'security_alert',
        data: {
          name: 'Bob Wilson',
          alertType: 'password_changed',
          timestamp: '2024-01-15T10:30:00Z',
          ipAddress: '192.168.1.1',
        },
      });

      expect(html).toContain('Bob Wilson');
      expect(html).toContain('Your Password Was Changed');
      expect(html).toContain('192.168.1.1');
    });

    it('should render security alert email template for new signin', async () => {
      const html = await renderTemplate({
        type: 'security_alert',
        data: {
          name: 'Carol Davis',
          alertType: 'new_signin',
          timestamp: '2024-01-15T10:30:00Z',
          ipAddress: '10.0.0.1',
          location: 'San Francisco, CA',
          device: 'Chrome on macOS',
        },
      });

      expect(html).toContain('Carol Davis');
      expect(html).toContain('New Sign-In to Your Account');
      expect(html).toContain('10.0.0.1');
      expect(html).toContain('San Francisco, CA');
      expect(html).toContain('Chrome on macOS');
    });

    it('should render security alert email template for suspicious activity', async () => {
      const html = await renderTemplate({
        type: 'security_alert',
        data: {
          name: 'David Brown',
          alertType: 'suspicious_activity',
          timestamp: '2024-01-15T10:30:00Z',
          actionUrl: 'https://example.com/security',
        },
      });

      expect(html).toContain('David Brown');
      expect(html).toContain('Suspicious Activity Detected');
      expect(html).toContain('https://example.com/security');
      expect(html).toContain('Secure My Account');
    });
  });

  describe('getEmailSubject', () => {
    it('should return correct subject for verification email', () => {
      const subject = getEmailSubject({
        type: 'verification',
        data: { name: 'Test', verificationUrl: 'https://example.com' },
      });

      expect(subject).toBe('Verify your email address - UI SyncUp');
    });

    it('should return correct subject for password reset email', () => {
      const subject = getEmailSubject({
        type: 'password_reset',
        data: { name: 'Test', resetUrl: 'https://example.com' },
      });

      expect(subject).toBe('Reset your password - UI SyncUp');
    });

    it('should return correct subject for welcome email', () => {
      const subject = getEmailSubject({
        type: 'welcome',
        data: { name: 'Test', dashboardUrl: 'https://example.com' },
      });

      expect(subject).toBe('Welcome to UI SyncUp!');
    });

    it('should return correct subject for password changed alert', () => {
      const subject = getEmailSubject({
        type: 'security_alert',
        data: {
          name: 'Test',
          alertType: 'password_changed',
          timestamp: '2024-01-15T10:30:00Z',
        },
      });

      expect(subject).toBe('Your password was changed - UI SyncUp');
    });

    it('should return correct subject for new signin alert', () => {
      const subject = getEmailSubject({
        type: 'security_alert',
        data: {
          name: 'Test',
          alertType: 'new_signin',
          timestamp: '2024-01-15T10:30:00Z',
        },
      });

      expect(subject).toBe('New sign-in to your account - UI SyncUp');
    });

    it('should return correct subject for suspicious activity alert', () => {
      const subject = getEmailSubject({
        type: 'security_alert',
        data: {
          name: 'Test',
          alertType: 'suspicious_activity',
          timestamp: '2024-01-15T10:30:00Z',
        },
      });

      expect(subject).toBe('Security alert for your account - UI SyncUp');
    });
  });
});
