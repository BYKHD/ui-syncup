import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';

interface EmailLayoutProps {
  preview?: string;
  children: React.ReactNode;
}

const LogoMark = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 220 218"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path
      d="M119.001 109.071V209.071H99.001V132.879L14.002 216.212L0 201.931L84.5166 119.071H9.00098V99.0713H109.001L119.001 109.071ZM186.782 172.711L179.711 179.782L172.641 186.854L132.234 146.447L139.306 139.376L146.376 132.305L186.782 172.711ZM209.001 119.071H151.857V99.0713H209.001V119.071ZM85.7676 71.6953L71.625 85.8379L31.2188 45.4316L45.3613 31.2891L85.7676 71.6953ZM209.001 9.07129L216.071 16.1426L146.376 85.8379L139.306 78.7666L132.234 71.6953L201.93 2L209.001 9.07129ZM119.001 66.2139H99.001V9.07129H119.001V66.2139Z"
      fill="#18181b"
    />
  </svg>
);

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
                      <LogoMark />
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
