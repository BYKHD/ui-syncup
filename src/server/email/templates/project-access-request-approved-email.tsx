import * as React from 'react';
import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import { EmailLayout } from './layout';

interface ProjectAccessRequestApprovedEmailProps {
  projectName: string;
  returnUrl: string;
}

export function ProjectAccessRequestApprovedEmail({
  projectName,
  returnUrl,
}: ProjectAccessRequestApprovedEmailProps) {
  return (
    <EmailLayout preview={`Your access to ${projectName} has been approved`}>
      <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
        You&apos;re in!
      </Heading>

      <Text className="text-black text-[14px] leading-[24px]">Hello,</Text>

      <Text className="text-black text-[14px] leading-[24px]">
        Your request to access the <strong>{projectName}</strong> project has been approved. You now have viewer access and can start reviewing issues and feedback.
      </Text>

      <Section className="text-center mt-[32px] mb-[32px]">
        <Button
          className="bg-[#18181b] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
          href={returnUrl}
        >
          Open the Project
        </Button>
      </Section>

      <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
    </EmailLayout>
  );
}
