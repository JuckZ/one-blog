import '../styles/globals.css'
import { DevtoolsProvider } from "@providers/devtools";
import { Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { notificationProvider, RefineSnackbarProvider } from "@refinedev/mui";
import routerProvider from "@refinedev/nextjs-router";
import { Metadata } from "next";
import { cookies, headers } from "next/headers";
import React, { Suspense } from "react";

import { ColorModeContextProvider } from "@contexts/color-mode";
import { authProvider } from "@providers/auth-provider";
import { dataProvider } from "@providers/data-provider";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "One Blog",
    template: "%s | One Blog",
  },
  description: "默认中文、支持英文的个人知识博客。",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const requestHeaders = headers();
  const theme = cookieStore.get("theme");
  const defaultMode = theme?.value === "dark" ? "dark" : "light";
  const htmlLanguage = requestHeaders.get("x-one-blog-locale") ?? "zh-CN";
  const isPublicBlogRoute = requestHeaders.get("x-one-blog-public") === "1";

  return (
    <html lang={htmlLanguage}>
      <body>
        {isPublicBlogRoute ? (
          children
        ) : (
          <Suspense>
            <RefineKbarProvider>
              <ColorModeContextProvider defaultMode={defaultMode}>
                <RefineSnackbarProvider>
                  <DevtoolsProvider>
                    <Refine
                      routerProvider={routerProvider}
                      authProvider={authProvider}
                      dataProvider={dataProvider}
                      notificationProvider={notificationProvider}
                      resources={[
                        {
                          name: "blog_posts",
                          list: "/blog-posts",
                          create: "/blog-posts/create",
                          edit: "/blog-posts/edit/:id",
                          show: "/blog-posts/show/:id",
                          meta: {
                            canDelete: true,
                          },
                        },
                        {
                          name: "categories",
                          list: "/categories",
                          create: "/categories/create",
                          edit: "/categories/edit/:id",
                          show: "/categories/show/:id",
                          meta: {
                            canDelete: true,
                          },
                        },
                      ]}
                      options={{
                        syncWithLocation: true,
                        warnWhenUnsavedChanges: true,
                        useNewQueryKeys: true,
                        projectId: "EYhSsq-qspR72-2SydKw",
                      }}
                    >
                      {children}
                      <RefineKbar />
                    </Refine>
                  </DevtoolsProvider>
                </RefineSnackbarProvider>
              </ColorModeContextProvider>
            </RefineKbarProvider>
          </Suspense>
        )}
      </body>
    </html>
  );
}
