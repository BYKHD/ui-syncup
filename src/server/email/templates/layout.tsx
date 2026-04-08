import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';

interface EmailLayoutProps {
  preview?: string;
  children: React.ReactNode;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

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
                brand: '#18181b',
                'brand-dark': '#09090b',
                text: '#18181b',
                'text-muted': '#71717a',
              },
            },
          },
        }}
      >
        <Body className="bg-[#fafafa] my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#e4e4e7] rounded-xl my-[40px] mx-auto px-[28px] pt-[24px] pb-[28px] max-w-[480px] bg-white">
            {/* Logo */}
            <Section className="mb-[4px]">
              <table width="100%" cellPadding="0" cellSpacing="0">
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'center', paddingBottom: '4px' }}>
                      <Img
                        src={`${appUrl}/web-app-manifest-192x192.png`}
                        width="32"
                        height="32"
                        alt="UI SyncUp"
                        style={{ display: 'inline-block', verticalAlign: 'middle' }}
                      />
                      <span
                        style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#18181b',
                          fontFamily:
                            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          marginLeft: '7px',
                          verticalAlign: 'middle',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        UI SyncUp
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Hr className="border border-solid border-[#f4f4f5] my-[20px] mx-0 w-full" />

            {children}

            {/* Footer */}
            <Hr className="border border-solid border-[#f4f4f5] my-[24px] mx-0 w-full" />
            <Section className="text-center">
              <Text className="text-[11px] text-[#a1a1aa] leading-[18px] m-0">
                UI SyncUp — Visual Feedback &amp; Issue Tracking Platform
              </Text>
              <Text className="text-[11px] text-[#a1a1aa] leading-[18px] m-0 mt-[4px]">
                You&apos;re receiving this email because of activity on your account.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default EmailLayout;
