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

// Icon embedded as base64 — no external URL dependency, works in all email clients
const LOGO_ICON_SRC =
  'data:image/png;base64,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';

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
                        src={LOGO_ICON_SRC}
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
