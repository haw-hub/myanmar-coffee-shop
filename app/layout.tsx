import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Happy Coffee | Myanmar Coffee House",
  description: "မြန်မာ့တောင်တန်းဒေသမှ လတ်ဆတ်သော ကော်ဖီစေ့များဖြင့် ဖျော်ထားသော ကော်ဖီ။",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="my"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Padauk:wght@400;700&family=Playfair+Display:wght@600;700&display=swap" /></head><body>{children}</body></html>;
}
