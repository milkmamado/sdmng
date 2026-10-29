import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: '성동점 환자관리 | 로그인' },
    { name: 'description', content: '성동점 환자관리 시스템 로그인 및 담당 환자 관리.' },
    { property: 'og:title', content: '성동점 환자관리 | 로그인' },
    { property: 'og:description', content: '성동점 환자관리 시스템 로그인 및 담당 환자 관리.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: () => (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <App />
    </ClientOnly>
  ),
});
