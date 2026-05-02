import React from "react";
import { Sidebar } from "./Sidebar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto lg:min-h-screen pt-14 lg:pt-0">
        <div className="p-4 md:p-6 max-w-screen-xl">
          {children}
        </div>
      </main>
    </div>
  );
}
