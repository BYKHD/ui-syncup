import * as React from 'react';
import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import { EmailLayout } from './layout';

interface ProjectAccessRequestReceivedEmailProps {
  requesterName: string;
  requesterEmail: string;
  projectName: string;
  message: string | null;
  reviewUrl: string;
}

export function ProjectAccessRequestReceivedEmail({
  requesterName,
  requesterEmail,
  projectName,
  message,
  reviewUrl,
}: ProjectAccessRequestReceivedEmailProps) {
  return (
    <EmailLayout preview={`New access request for ${projectName}`}>
      <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
        New access request for <strong>{projectName}</strong>
      </Heading>

      <Text className="text-black text-[14px] leading-[24px]">Hello,</Text>

      <Text className="text-black text-[14px] leading-[24px]">
        <strong>{requesterName}</strong> ({requesterEmail}) has requested access to the{' '}
        <strong>{projectName}</strong> project on UI SyncUp.
      </Text>

      {message !== null && (
        <Section className="bg-gray-50 rounded border border-gray-200 px-4 py-3 mb-4">
          <Text className="text-black text-[14px] leading-[24px] m-0">
            &ldquo;{message}&rdquo;
          </Text>
        </Section>
      )}

      <Section className="text-center mt-[32px] mb-[32px]">
        <Button
          className="bg-[#18181b] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
          href={reviewUrl}
        >
          Review Request
        </Button>
      </Section>

      <Text className="text-gray-500 text-[14px] leading-[24px]">
        You can approve or decline this request from the project members page. Only project admins and owners can manage access requests.
      </Text>

      <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
    </EmailLayout>
  );
}
