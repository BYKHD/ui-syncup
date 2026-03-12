import * as React from 'react';
import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import { EmailLayout } from './layout';

interface OwnershipTransferEmailProps {
  teamName: string;
  previousOwnerName: string;
  newOwnerName: string;
  isNewOwner: boolean;
  teamUrl: string;
}

export function OwnershipTransferEmail({ 
  teamName, 
  previousOwnerName, 
  newOwnerName,
  isNewOwner,
  teamUrl
}: OwnershipTransferEmailProps) {
  const previewText = isNewOwner 
    ? `You are now the owner of ${teamName}`
    : `Ownership of ${teamName} has been transferred`;

  return (
    <EmailLayout preview={previewText}>
      <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
        Ownership Transfer: <strong>{teamName}</strong>
      </Heading>
      
      <Text className="text-black text-[14px] leading-[24px]">
        Hello,
      </Text>
      
      <Text className="text-black text-[14px] leading-[24px]">
        This email is to confirm that ownership of the team <strong>{teamName}</strong> has been transferred.
      </Text>

      <Section className="bg-gray-50 rounded border border-gray-200 p-4 my-4">
        <Text className="text-black text-[14px] m-0 mb-2">
          <strong>Previous Owner:</strong> {previousOwnerName}
        </Text>
        <Text className="text-black text-[14px] m-0">
          <strong>New Owner:</strong> {newOwnerName}
        </Text>
      </Section>

      {isNewOwner ? (
        <Text className="text-black text-[14px] leading-[24px]">
          You have been designated as the new owner of this team. You now have full administrative control, including team deletion.
        </Text>
      ) : (
        <Text className="text-black text-[14px] leading-[24px]">
          You have transferred ownership of this team. You remain an administrator of the team.
        </Text>
      )}
      
      <Section className="text-center mt-[32px] mb-[32px]">
        <Button
          className="bg-[#2563eb] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
          href={teamUrl}
        >
          Go to Team Settings
        </Button>
      </Section>
      
      <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
    </EmailLayout>
  );
}
