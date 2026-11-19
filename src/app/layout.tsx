import type { Metadata } from "next"
import { Cinzel, Merriweather_Sans } from "next/font/google"
import "./globals.css"

const bodyFont = Merriweather_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-body",
})

const displayFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
})

export const metadata: Metadata = {
  title: "Orna Item Quality",
  description: "Calcula a porcentagem de qualidade de um item do Orna a partir do print.",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className={bodyFont.className}>{props.children}</body>
    </html>
  )
}
