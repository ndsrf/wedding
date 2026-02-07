import { Metadata } from 'next';

const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

export const metadata: Metadata = {
  title: `Contact Us - ${commercialName}`,
  description: `Get in touch with ${commercialName}. We're here to help you transform your wedding planning business.`,
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
