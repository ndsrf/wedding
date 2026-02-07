import { Metadata } from 'next';

const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

export const metadata: Metadata = {
  title: `About ${commercialName} - Wedding Management Platform`,
  description: `Learn about ${commercialName}, the wedding management platform empowering planners to create unforgettable experiences.`,
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
