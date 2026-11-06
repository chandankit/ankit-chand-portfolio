/** Decorative, fixed background: soft colour orbs plus a faint engineering grid. */
export function Backdrop() {
  return (
    <div aria-hidden className="no-print pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="backdrop-grid absolute inset-0" />
      <div className="orb absolute -left-[10%] -top-[18%] h-[55vmax] w-[55vmax] rounded-full" style={{ background: "radial-gradient(closest-side, var(--orb-1), transparent)" }} />
      <div
        className="orb absolute -right-[15%] top-[10%] h-[45vmax] w-[45vmax] rounded-full"
        style={{ background: "radial-gradient(closest-side, var(--orb-2), transparent)", animationDelay: "-7s" }}
      />
      <div
        className="orb absolute bottom-[-20%] left-[25%] h-[40vmax] w-[40vmax] rounded-full"
        style={{ background: "radial-gradient(closest-side, var(--orb-3), transparent)", animationDelay: "-14s" }}
      />
    </div>
  );
}
