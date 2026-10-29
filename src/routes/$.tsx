import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/$")({
  head: () => ({ meta: [
    { title: '성동점 환자관리 | 업무 관리' },
    { name: 'description', content: '성동점 담당 환자의 일별 상태, CRM 동기화 및 매출 관리.' },
    { property: 'og:title', content: '성동점 환자관리 | 업무 관리' },
    { property: 'og:description', content: '성동점 담당 환자의 일별 상태, CRM 동기화 및 매출 관리.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: () => <App />,
});
