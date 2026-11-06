/**
 * Re-mounts on every navigation, so the CSS entrance animation replays per
 * page. Pure CSS: it runs before hydration and never leaves content hidden.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
