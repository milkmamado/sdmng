import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { ClientOnly, Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import appCss from "../styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "성동면력한방병원 환자관리" },
      { property: "og:title", content: "성동면력한방병원 환자관리" },
      { name: "twitter:title", content: "성동면력한방병원 환자관리" },
      { name: "description", content: "성동점 상담 관리 애플리케이션은 고객 상담 및 환자 정보를 효율적으로 관리합니다." },
      { property: "og:description", content: "성동점 상담 관리 애플리케이션은 고객 상담 및 환자 정보를 효율적으로 관리합니다." },
      { name: "twitter:description", content: "성동점 상담 관리 애플리케이션은 고객 상담 및 환자 정보를 효율적으로 관리합니다." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/92ea976a-0735-41ec-a1da-ed7ddf353c52/id-preview-1e8d1e49--2e2a51e4-c95c-4657-8637-0990159cceba.lovable.app-1778733364080.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/92ea976a-0735-41ec-a1da-ed7ddf353c52/id-preview-1e8d1e49--2e2a51e4-c95c-4657-8637-0990159cceba.lovable.app-1778733364080.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
          <BrowserRouter>
            <AuthProvider>
              <Outlet />
            </AuthProvider>
          </BrowserRouter>
        </ClientOnly>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}
