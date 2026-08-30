import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ယုံကြည် ကော်ဖီ | Myanmar Coffee House",
  description: "မြန်မာ့တောင်တန်းဒေသမှ လတ်ဆတ်သော ကော်ဖီစေ့များဖြင့် ဖျော်ထားသော ကော်ဖီ။",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="my"><body>{children}</body></html>;
}
