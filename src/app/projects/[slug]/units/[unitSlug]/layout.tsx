// Layout for unit tour pages
// Desktop: enforce full-screen immersive view, hide footer overflow
// Mobile: allow normal scroll for the specs card below the video

export default function UnitTourLayout({ children }: { children: React.ReactNode }) {
  return (
    // On desktop: h-screen + overflow-hidden gives true full-screen immersive view
    // On mobile: auto height allows scrolling through the specs card
    <div className="md:overflow-hidden md:h-screen">
      {children}
    </div>
  );
}
