import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { WATER_STRINGS, type AffinityString } from "@/lib/affinity-data";
import type { Background } from "@/lib/ttrpg-data";
import type { InventoryItem } from "@/lib/ttrpg-data";

export interface HomebrewAffinityData {
  id: number;
  name: string;
  description: string;
  strings: AffinityString[];
  published: boolean;
}

export interface HomebrewItemData {
  id: number;
  published: boolean;
  item: InventoryItem;
}

export interface HomebrewBackgroundData {
  id: number;
  published: boolean;
  background: Background;
}

interface HomebrewContextValue {
  publishedAffinities: HomebrewAffinityData[];
  publishedItems: HomebrewItemData[];
  publishedBackgrounds: HomebrewBackgroundData[];
  allHomebrew: any[];
  isLoading: boolean;
  getAffinityStrings: (affinityName: string) => AffinityString[];
  getAvailableAffinityNames: () => string[];
  refetch: () => void;
}

const HomebrewContext = createContext<HomebrewContextValue>({
  publishedAffinities: [],
  publishedItems: [],
  publishedBackgrounds: [],
  allHomebrew: [],
  isLoading: false,
  getAffinityStrings: () => [],
  getAvailableAffinityNames: () => ["Water"],
  refetch: () => {},
});

export function HomebrewProvider({ children }: { children: ReactNode }) {
  const [publishedAffinities, setPublishedAffinities] = useState<HomebrewAffinityData[]>([]);
  const [publishedItems, setPublishedItems] = useState<HomebrewItemData[]>([]);
  const [publishedBackgrounds, setPublishedBackgrounds] = useState<HomebrewBackgroundData[]>([]);
  const [allHomebrew, setAllHomebrew] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPublished = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/homebrew/published", { credentials: "include" });
      if (!res.ok) return;
      const items: any[] = await res.json();
      
      const affinities: HomebrewAffinityData[] = [];
      const homebrewItems: HomebrewItemData[] = [];
      const backgrounds: HomebrewBackgroundData[] = [];

      for (const item of items) {
        if (item.type === "affinity") {
          affinities.push({
            id: item.id,
            name: item.name,
            description: item.data?.description ?? "",
            strings: item.data?.strings ?? [],
            published: item.published,
          });
        } else if (item.type === "item") {
          homebrewItems.push({
            id: item.id,
            published: item.published,
            item: { id: `hb_${item.id}`, ...item.data },
          });
        } else if (item.type === "background") {
          backgrounds.push({
            id: item.id,
            published: item.published,
            background: item.data,
          });
        }
      }

      setPublishedAffinities(affinities);
      setPublishedItems(homebrewItems);
      setPublishedBackgrounds(backgrounds);
    } catch {
      // ignore network errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/homebrew", { credentials: "include" });
      if (!res.ok) return;
      const items = await res.json();
      setAllHomebrew(items);
    } catch {
      // ignore
    }
  }, []);

  const refetch = useCallback(() => {
    fetchPublished();
    fetchAll();
  }, [fetchPublished, fetchAll]);

  useEffect(() => {
    fetchPublished();
    fetchAll();
  }, [fetchPublished, fetchAll]);

  function getAffinityStrings(affinityName: string): AffinityString[] {
    if (affinityName === "Water") return WATER_STRINGS;
    const found = publishedAffinities.find(a => a.name === affinityName);
    return found?.strings ?? [];
  }

  function getAvailableAffinityNames(): string[] {
    const homebrew = publishedAffinities.map(a => a.name);
    return ["Water", ...homebrew.filter(n => n !== "Water")];
  }

  return (
    <HomebrewContext.Provider value={{
      publishedAffinities,
      publishedItems,
      publishedBackgrounds,
      allHomebrew,
      isLoading,
      getAffinityStrings,
      getAvailableAffinityNames,
      refetch,
    }}>
      {children}
    </HomebrewContext.Provider>
  );
}

export function useHomebrew() {
  return useContext(HomebrewContext);
}
