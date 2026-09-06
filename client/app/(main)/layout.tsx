import Navbar from "@/components/layout/Navbar/Navbar";
import Footer from "@/components/layout/Footer";
import { Container } from "@/components/ui/container";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col">
            <Navbar />
            <main id="main" className="grow py-8">
                <Container>{children}</Container>
            </main>
            <Footer />
        </div>
    );
}
