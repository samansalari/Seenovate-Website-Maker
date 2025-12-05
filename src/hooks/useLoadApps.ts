import { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { appBasePathAtom, appsListAtom } from "@/atoms/appAtoms";
import { getClient } from "@/api/index";

export function useLoadApps() {
  const [apps, setApps] = useAtom(appsListAtom);
  const [, setAppBasePath] = useAtom(appBasePathAtom);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshApps = useCallback(async () => {
    setLoading(true);
    try {
      const client = getClient();
      const appListResponse = await client.listApps();
      setApps(appListResponse.apps);
      if ('appBasePath' in appListResponse) {
        setAppBasePath(appListResponse.appBasePath);
      }
      setError(null);
    } catch (error) {
      console.error("Error refreshing apps:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  }, [setApps, setError, setLoading]);

  useEffect(() => {
    refreshApps();
  }, [refreshApps]);

  return { apps, loading, error, refreshApps };
}
