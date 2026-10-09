import "@/styles/globals.css";
import type { Metadata } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
    title: "UNDEROATH",
    description:
        "A dark-fantasy action RPG that runs in your browser. Built with Phaser 3 and Next.js.",
    icons: {
        icon: `${basePath}/favicon.png`,
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
