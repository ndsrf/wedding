/**
 * AMP Link Component
 *
 * Adds a link rel="amphtml" tag to the document head.
 * This component should be included in pages that have an AMP version.
 *
 * In React 18+ and Next.js App Router, link tags can be rendered in Server Components
 * and React will automatically hoist them to the document head.
 */

export default function AMPLink({ ampUrl }: { ampUrl: string }) {
  return (
    <>
      <link rel="amphtml" href={ampUrl} />
    </>
  );
}
