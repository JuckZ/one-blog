"use client";

import { AppIcon } from "@components/app-icon";
import { Header } from "@components/header";
import { ThemedLayout as RefineLayout, ThemedTitle } from "@refinedev/mui";
import React from "react";

export const ThemedLayout = ({ children }: React.PropsWithChildren) => {
  return (
    <RefineLayout
      Header={() => <Header sticky />}
      Title={({ collapsed }) => (
        <ThemedTitle
          collapsed={collapsed}
          text="Refine Project"
          icon={<AppIcon />}
        />
      )}
    >
      {children}
    </RefineLayout>
  );
};
