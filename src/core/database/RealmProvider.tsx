import React from "react";
import { RealmProvider as BaseRealmProvider } from "@realm/react";
import { realmSchemas } from "./schema";

type DatabaseProviderProps = {
  children: React.ReactNode;
};

/**
 * Database provider wrapping the app with Realm context
 * All components can use useRealm, useQuery, useObject hooks
 */
export function DatabaseProvider({ children }: DatabaseProviderProps) {
  return (
    <BaseRealmProvider schema={realmSchemas}>{children}</BaseRealmProvider>
  );
}
