// Full-screen layout for the master plan explorer
// (same pattern as unit tour layout)
export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:overflow-hidden md:h-screen">
      {children}
    </div>
  );
}
