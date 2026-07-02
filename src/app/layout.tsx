import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FasaWait",
  description: "SaaS multiempresa para gerenciamento de filas.",
};

const browserExtensionAttributeCleanup = `
(() => {
  const blockedNames = new Set(["bis_skin_checked", "bis_register"]);
  const blockedPrefixes = ["__processed_"];
  const shouldRemove = (name) =>
    blockedNames.has(name) || blockedPrefixes.some((prefix) => name.startsWith(prefix));
  const cleanElement = (element) => {
    if (!element?.attributes) return;
    for (const attribute of Array.from(element.attributes)) {
      if (shouldRemove(attribute.name)) {
        element.removeAttribute(attribute.name);
      }
    }
  };
  const cleanTree = (root) => {
    if (!root) return;
    cleanElement(root);
    for (const element of root.querySelectorAll?.("*") ?? []) {
      cleanElement(element);
    }
  };

  cleanTree(document.documentElement);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        cleanElement(mutation.target);
      }
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          cleanTree(node);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
  });

  window.addEventListener(
    "load",
    () => window.setTimeout(() => observer.disconnect(), 3000),
    { once: true },
  );
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script
          dangerouslySetInnerHTML={{ __html: browserExtensionAttributeCleanup }}
          id="browser-extension-attribute-cleanup"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
