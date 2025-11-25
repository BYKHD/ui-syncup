import * as React from 'react';
import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from '@react-email/components';
import { EmailLayout } from './layout';

interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
}

export function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Reset your UI SyncUp password">
      <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
        Reset Your Password
      </Heading>
      
      <Text className="text-black text-[14px] leading-[24px]">
        Hi {name},
      </Text>
      
      <Text className="text-black text-[14px] leading-[24px]">
        We received a request to reset your password for your UI SyncUp account. Click the button below to create a new password:
      </Text>
      
      <Section className="text-center mt-[32px] mb-[32px]">
        <Button
          className="bg-[#2563eb] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
          href={resetUrl}
        >
          Reset Password
        </Button>
      </Section>
      
      <Text className="text-black text-[14px] leading-[24px]">
        Or copy and paste this link into your browser:
      </Text>
      
      <Section className="bg-gray-50 rounded border border-gray-200 p-3 mb-4">
        <Link
          href={resetUrl}
          className="text-blue-600 no-underline break-all text-sm"
        >
          {resetUrl}
        </Link>
      </Section>
      
      <Text className="text-gray-500 text-[14px] leading-[24px]">
        This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </Text>
      
      <Section className="bg-yellow-50 border border-yellow-200 rounded p-4 my-4">
        <Text className="text-yellow-800 text-[14px] font-medium m-0 mb-2">
          For security reasons, we recommend that you:
        </Text>
        <ul className="text-[14px] leading-[24px] pl-5 m-0 text-yellow-800">
          <li className="mb-1">Use a strong, unique password</li>
          <li className="mb-1">Never share your password with anyone</li>
          <li className="mb-0">Enable two-factor authentication when available</li>
        </ul>
      </Section>
      
      <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
    </EmailLayout>
  );
}
