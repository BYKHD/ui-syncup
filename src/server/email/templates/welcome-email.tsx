import * as React from 'react';
import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import { EmailLayout } from './layout';

interface WelcomeEmailProps {
  name: string;
  dashboardUrl: string;
}

export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview="Welcome to UI SyncUp! Your account is active.">
      <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
        Welcome to <strong>UI SyncUp</strong>! 🎉
      </Heading>
      
      <Text className="text-black text-[14px] leading-[24px]">
        Hi {name},
      </Text>
      
      <Text className="text-black text-[14px] leading-[24px]">
        Your email has been verified and your account is now active! We're excited to have you on board.
      </Text>
      
      <Text className="text-black text-[14px] leading-[24px]">
        UI SyncUp is a visual feedback and issue tracking platform designed to streamline collaboration between designers, developers, and QA teams. Here's what you can do:
      </Text>
      
      <Section className="bg-gray-50 rounded-lg p-4 my-4">
        <ul className="text-[14px] leading-[24px] pl-5 m-0 text-black">
          <li className="mb-2"><strong>Create Projects:</strong> Organize your work into projects and invite team members</li>
          <li className="mb-2"><strong>Visual Annotations:</strong> Add pin-based and box annotations directly on UI mockups</li>
          <li className="mb-2"><strong>Track Issues:</strong> Create, assign, and track issues through your workflow</li>
          <li className="mb-0"><strong>Collaborate:</strong> Comment on issues and annotations to keep everyone in sync</li>
        </ul>
      </Section>
      
      <Section className="text-center mt-[32px] mb-[32px]">
        <Button
          className="bg-[#2563eb] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
          href={dashboardUrl}
        >
          Go to Dashboard
        </Button>
      </Section>
      
      <Text className="text-gray-500 text-[14px] leading-[24px]">
        Need help getting started? Check out our documentation or reach out to our support team.
      </Text>
      
      <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
    </EmailLayout>
  );
}
