"use client";
import { AppIcon } from "@components/app-icon";
import type { AuthPageProps } from "@refinedev/core";
import { AuthPage as AuthPageBase, ThemedTitle } from "@refinedev/mui";

export const AuthPage = (props: AuthPageProps) => {
  return (
    <AuthPageBase
      {...props}
      formProps={{
        defaultValues: {
          email: "info@refine.dev",
          password: "refine-supabase",
        },
      }}
      title={
        <ThemedTitle
          collapsed={false}
          text="Refine Project"
          icon={<AppIcon />}
        />
      }
    />
  );
};
