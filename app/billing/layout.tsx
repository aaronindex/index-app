// app/billing/layout.tsx
// Force dynamic rendering for billing pages (they use search params and client-side auth)

export const dynamic = 'force-dynamic';

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

