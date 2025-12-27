import { Stack, useLocalSearchParams } from "expo-router";
import { SourceBrowseScreen } from "@/features/Browse/screens/SourceBrowseScreen";
import { getSource } from "@/sources";

export default function SourceBrowseRoute() {
  const { sourceId } = useLocalSearchParams<{ sourceId: string }>();
  const source = getSource(sourceId || "");

  return (
    <>
      <Stack.Screen
        options={{
          title: source?.name || "Source",
        }}
      />
      <SourceBrowseScreen />
    </>
  );
}
