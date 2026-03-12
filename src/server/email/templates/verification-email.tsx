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

interface VerificationEmailProps {
  name: string;
  verificationUrl: string;
}

export function VerificationEmail({ name, verificationUrl }: VerificationEmailProps) {
  return (
    <EmailLayout preview="Verify your email address for UI SyncUp">
      <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
        Welcome to <strong>UI SyncUp</strong>!
      </Heading>
      
      <Text className="text-black text-[14px] leading-[24px]">
        Hi {name},
      </Text>
      
      <Text className="text-black text-[14px] leading-[24px]">
        Thank you for signing up for UI SyncUp. To complete your registration and activate your account, please verify your email address by clicking the button below:
      </Text>
      
      <Section className="text-center mt-[32px] mb-[32px]">
        <Button
          className="bg-[#2563eb] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
          href={verificationUrl}
        >
          Verify Email Address
        </Button>
      </Section>
      
      <Text className="text-black text-[14px] leading-[24px]">
        Or copy and paste this link into your browser:
      </Text>
      
      <Section className="bg-gray-50 rounded border border-gray-200 p-3 mb-4">
        <Link
          href={verificationUrl}
          className="text-blue-600 no-underline break-all text-sm"
        >
          {verificationUrl}
        </Link>
      </Section>
      
      <Text className="text-gray-500 text-[14px] leading-[24px]">
        This verification link will expire in 24 hours. If you didn't create an account with UI SyncUp, you can safely ignore this email.
      </Text>
      
      <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
    </EmailLayout>
  );
}
