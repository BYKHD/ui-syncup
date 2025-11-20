import * as React from 'react';
import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import { EmailLayout } from './layout';

interface SecurityAlertEmailProps {
  name: string;
  alertType: 'password_changed' | 'new_signin' | 'suspicious_activity';
  timestamp: string;
  ipAddress?: string;
  location?: string;
  device?: string;
  actionUrl?: string;
}

export function SecurityAlertEmail({ 
  name, 
  alertType, 
  timestamp, 
  ipAddress, 
  location, 
  device,
  actionUrl 
}: SecurityAlertEmailProps) {
  const getAlertTitle = () => {
    switch (alertType) {
      case 'password_changed':
        return 'Your Password Was Changed';
      case 'new_signin':
        return 'New Sign-In to Your Account';
      case 'suspicious_activity':
        return 'Suspicious Activity Detected';
      default:
        return 'Security Alert';
    }
  };

  const getAlertMessage = () => {
    switch (alertType) {
      case 'password_changed':
        return 'Your password was successfully changed. If you made this change, no further action is needed.';
      case 'new_signin':
        return 'A new sign-in to your account was detected from a device or location we don\'t recognize.';
      case 'suspicious_activity':
        return 'We detected unusual activity on your account that may indicate unauthorized access.';
      default:
        return 'We detected a security event on your account.';
    }
  };

  const getActionText = () => {
    switch (alertType) {
      case 'password_changed':
        return 'If you didn\'t make this change, please reset your password immediately and contact our support team.';
      case 'new_signin':
        return 'If this was you, you can ignore this email. If you don\'t recognize this activity, please secure your account immediately.';
      case 'suspicious_activity':
        return 'Please review your recent account activity and change your password if you notice anything suspicious.';
      default:
        return 'Please review your account security settings.';
    }
  };

  return (
    <EmailLayout preview={`Security Alert: ${getAlertTitle()}`}>
      <Section className="bg-red-50 border border-red-200 rounded p-4 mb-6 text-center">
        <Heading className="text-red-700 text-[24px] font-bold m-0 mb-2">
          🔒 {getAlertTitle()}
        </Heading>
      </Section>
      
      <Text className="text-black text-[14px] leading-[24px]">
        Hi {name},
      </Text>
      
      <Text className="text-black text-[14px] leading-[24px]">
        {getAlertMessage()}
      </Text>
      
      <Section className="bg-gray-50 rounded border border-gray-200 p-4 my-4">
        <Text className="text-gray-500 text-[12px] font-bold uppercase tracking-wider m-0 mb-3">
          Event Details
        </Text>
        <table className="w-full text-[14px]">
          <tbody>
            <tr>
              <td className="py-1 text-gray-600 font-medium w-24">Time:</td>
              <td className="py-1 text-black">{new Date(timestamp).toLocaleString()}</td>
            </tr>
            {ipAddress && (
              <tr>
                <td className="py-1 text-gray-600 font-medium">IP Address:</td>
                <td className="py-1 text-black">{ipAddress}</td>
              </tr>
            )}
            {location && (
              <tr>
                <td className="py-1 text-gray-600 font-medium">Location:</td>
                <td className="py-1 text-black">{location}</td>
              </tr>
            )}
            {device && (
              <tr>
                <td className="py-1 text-gray-600 font-medium">Device:</td>
                <td className="py-1 text-black">{device}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>
      
      <Text className="text-black text-[14px] leading-[24px] font-medium">
        {getActionText()}
      </Text>
      
      {actionUrl && (
        <Section className="text-center mt-[32px] mb-[32px]">
          <Button
            className="bg-[#dc2626] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
            href={actionUrl}
          >
            Secure My Account
          </Button>
        </Section>
      )}
      
      <Section className="bg-gray-50 rounded p-4 mt-6">
        <Text className="text-gray-700 text-[14px] font-bold m-0 mb-2">
          Security Tips:
        </Text>
        <ul className="text-[14px] leading-[24px] pl-5 m-0 text-gray-600">
          <li className="mb-1">Use a strong, unique password for your account</li>
          <li className="mb-1">Never share your password with anyone</li>
          <li className="mb-1">Be cautious of phishing emails</li>
          <li className="mb-0">Keep your contact information up to date</li>
        </ul>
      </Section>
      
      <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
      
      <Text className="text-[12px] text-gray-500 text-center">
        This is an automated security alert. Please do not reply to this email.
      </Text>
    </EmailLayout>
  );
}
