import { fetchApi } from '@/lib/api-client';
import { FeatureFlag } from '@/lib/types';
import { MODULE_KEYS } from '@/lib/platformModules';
import PlatformModulesGrid from './PlatformModulesGrid';

async function getFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    return await fetchApi<FeatureFlag[]>('/feature-flags/');
  } catch {
    return [];
  }
}

export default async function PlatformModulesSection() {
  const flags = await getFeatureFlags();

  const enabledMap: Record<string, boolean> = {};
  for (const key of MODULE_KEYS) {
    const flag = flags.find((f) => f.key === key);
    enabledMap[key] = flag ? flag.is_enabled : true;
  }

  return <PlatformModulesGrid enabledMap={enabledMap} />;
}
