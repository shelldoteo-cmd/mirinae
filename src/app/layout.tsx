import type { Metadata } from "next";
import "./globals.css";
import { OrientalProvider } from "@/components/OrientalProvider";

export const metadata: Metadata = {
  title: "미리내야담 대본 생성기 | 초장편 조선 설화 유튜브 대본 메이커",
  description: "조선시대 기이한 이야기와 권선징악의 야담 대본을 1만자 이상 고품격 단계별 생성하고, Google Cloud TTS를 활용한 고음질 한국어 목소리 합성까지 원클릭으로 완수해주는 전문 대본 제작 크리에이터 툴입니다.",
  keywords: ["미리내야담", "야담 대본 생성기", "조선시대 야담", "유튜브 대본 AI", "Google TTS", "SSML", "기담"],
  authors: [{ name: "미리내야담 작가진" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col font-sans antialiased text-[#f4eae0]">
        <OrientalProvider>{children}</OrientalProvider>
      </body>
    </html>
  );
}
