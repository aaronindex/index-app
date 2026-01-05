// Force this to be a dynamic route to avoid static generation issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Home() {
  return (
    <div>
      <h1>INDEX</h1>
      <p>Test page</p>
    </div>
  );
}
