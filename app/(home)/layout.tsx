// Edge-to-edge layout for the home page. No header, no container padding —
// <HomeShell /> renders its own sticky chrome + bottom nav.
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
