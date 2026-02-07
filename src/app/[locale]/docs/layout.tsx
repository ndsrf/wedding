import { Metadata } from 'next';

const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

export const metadata: Metadata = {
  title: `Documentation - ${commercialName}`,
  description: `Everything you need to know about using ${commercialName} for wedding planning and management.`,
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
