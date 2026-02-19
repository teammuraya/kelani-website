// Full-screen layout for building floor plan viewer
// (same pattern as master plan & unit tour layouts)
export default function BuildingViewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:overflow-hidden md:h-screen">
      {children}
    </div>
  );
}
