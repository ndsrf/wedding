import { Metadata } from 'next';

const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

export const metadata: Metadata = {
  title: `Privacy Policy - ${commercialName}`,
  description: `Learn how ${commercialName} protects your privacy and handles your personal information.`,
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
