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

interface TeamInvitationEmailProps {
  inviterName: string;
  teamName: string;
  invitationUrl: string;
  expiresIn: string;
}

export function TeamInvitationEmail({ 
  inviterName, 
  teamName, 
  invitationUrl, 
  expiresIn 
}: TeamInvitationEmailProps) {
  return (
    <EmailLayout preview={`Join ${teamName} on UI SyncUp`}>
      <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
        Join <strong>{teamName}</strong> on UI SyncUp
      </Heading>
      
      <Text className="text-black text-[14px] leading-[24px]">
        Hello,
      </Text>
      
      <Text className="text-black text-[14px] leading-[24px]">
        <strong>{inviterName}</strong> has invited you to join the <strong>{teamName}</strong> team on UI SyncUp. Collaborate on projects, manage issues, and sync your UI development workflow.
      </Text>
      
      <Section className="text-center mt-[32px] mb-[32px]">
        <Button
          className="bg-[#2563eb] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
          href={invitationUrl}
        >
          Accept Invitation
        </Button>
      </Section>
      
      <Text className="text-black text-[14px] leading-[24px]">
        Or copy and paste this link into your browser:
      </Text>
      
      <Section className="bg-gray-50 rounded border border-gray-200 p-3 mb-4">
        <Link
          href={invitationUrl}
          className="text-blue-600 no-underline break-all text-sm"
        >
          {invitationUrl}
        </Link>
      </Section>
      
      <Text className="text-gray-500 text-[14px] leading-[24px]">
        This invitation will expire in {expiresIn}. If you were not expecting this invitation, you can safely ignore this email.
      </Text>
      
      <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
    </EmailLayout>
  );
}
