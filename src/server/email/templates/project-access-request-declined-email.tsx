import * as React from 'react';
import {
  Heading,
  Hr,
  Text,
} from '@react-email/components';
import { EmailLayout } from './layout';

interface ProjectAccessRequestDeclinedEmailProps {
  projectName: string;
}

export function ProjectAccessRequestDeclinedEmail({
  projectName,
}: ProjectAccessRequestDeclinedEmailProps) {
  return (
    <EmailLayout preview={`Update on your access request for ${projectName}`}>
      <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
        Update on your access request
      </Heading>

      <Text className="text-black text-[14px] leading-[24px]">Hello,</Text>

      <Text className="text-black text-[14px] leading-[24px]">
        Your request to access the <strong>{projectName}</strong> project was not approved at this time.
      </Text>

      <Text className="text-gray-500 text-[14px] leading-[24px]">
        If you believe this is a mistake or need access for a specific reason, please reach out to the project owner directly.
      </Text>

      <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
    </EmailLayout>
  );
}
