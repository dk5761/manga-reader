import { memo, useCallback, useState, useRef, useEffect } from "react";
import { View, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLibraryStore } from "../stores/useLibraryStore";

const DEBOUNCE_MS = 300;

/**
 * Search bar for filtering library manga by title.
 * Uses debounced input to avoid excessive filtering.
 */
export const LibrarySearchBar = memo(function LibrarySearchBar() {
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);

  // Local state for immediate UI feedback
  const [localValue, setLocalValue] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Sync local state when store changes externally
  useEffect(() => {
    setLocalValue(searchQuery);
  }, [searchQuery]);

  const handleChange = useCallback(
    (text: string) => {
      setLocalValue(text);

      // Debounce store update
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        setSearchQuery(text);
      }, DEBOUNCE_MS);
    },
    [setSearchQuery]
  );

  const handleClear = useCallback(() => {
    setLocalValue("");
    setSearchQuery("");
  }, [setSearchQuery]);

  return (
    <View className="flex-row items-center mx-4 mb-3 px-3 py-2 rounded-lg bg-zinc-800">
      <Ionicons name="search" size={18} color="#71717a" />
      <TextInput
        value={localValue}
        onChangeText={handleChange}
        placeholder="Search library..."
        placeholderTextColor="#71717a"
        className="flex-1 ml-2 text-white text-base"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {localValue.length > 0 && (
        <Pressable onPress={handleClear} className="p-1">
          <Ionicons name="close-circle" size={18} color="#71717a" />
        </Pressable>
      )}
    </View>
  );
});
