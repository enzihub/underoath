"use client";

import styles from "@/styles/Home.module.css";
import dynamic from "next/dynamic";

// Import App component without server-side rendering
const AppWithoutSSR = dynamic(() => import("@/App"), { ssr: false });

export default function Home() {
    return (
        <main className={styles.main}>
            <AppWithoutSSR />
        </main>
    );
}
