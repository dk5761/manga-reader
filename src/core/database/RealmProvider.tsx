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
    <BaseRealmProvider
      schema={realmSchemas}
      schemaVersion={2}
      onMigration={(oldRealm, newRealm) => {
        // Migration from version 1 to 2: added localCover property
        // No data migration needed - new property will default to undefined
        if (oldRealm.schemaVersion < 2) {
          // Realm handles adding new optional properties automatically
        }
      }}
    >
      {children}
    </BaseRealmProvider>
  );
}
