import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';

interface EmailLayoutProps {
  preview?: string;
  children: React.ReactNode;
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      {preview && <Preview>{preview}</Preview>}
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: '#2563eb',
                'brand-dark': '#1e40af',
                text: '#333333',
                'text-muted': '#666666',
                bg: '#f8f9fa',
              },
            },
          },
        }}
      >
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px]">
              <Text className="text-brand text-[24px] font-bold text-center p-0 my-[30px] mx-0">
                UI SyncUp
              </Text>
            </Section>
            
            {children}

            <Section className="text-center mt-[32px] mb-[32px]">
              <Text className="text-[12px] text-text-muted leading-[24px]">
                UI SyncUp - Visual Feedback & Issue Tracking Platform
              </Text>
              <Text className="text-[12px] text-text-muted leading-[24px]">
                <Link href={process.env.NEXT_PUBLIC_APP_URL ?? "https://uisyncup.com"} className="text-brand underline">
                  Visit Dashboard
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default EmailLayout;
