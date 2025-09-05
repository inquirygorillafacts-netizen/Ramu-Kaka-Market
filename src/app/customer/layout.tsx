
import BottomNavbar from "@/components/BottomNavbar";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background font-body">
      <main className="pb-24">{children}</main>
      <BottomNavbar />
    </div>
  );
}
