---
name: TanStack Query cache invalidation pattern
description: Orval-generated mutation hooks never auto-invalidate query caches — must manually call queryClient.invalidateQueries after mutations.
---

**Rule:** After every mutation (create, update, delete), call `queryClient.invalidateQueries({ queryKey: getXxxQueryKey() })` in the `onSuccess` callback.

**Why:** The Orval-generated hooks in `@workspace/api-client-react` are bare TanStack Query mutations with no cache management. The `staleTime: 30_000` in the QueryClient means stale data persists for 30 seconds unless explicitly invalidated. This means deleting a character won't remove it from the list until the next refetch.

**How to apply:**
```ts
const queryClient = useQueryClient();
deleteMutation.mutate({ id }, {
  onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() }),
});
```
Key exports available: `getListCharactersQueryKey`, `getGetCharacterQueryKey` from `@workspace/api-client-react`.
