import { getModuleFlags } from '@/lib/moduleFlags';
import { MODULE_KEYS } from '@/lib/platformModules';
import PlatformModulesGrid from './PlatformModulesGrid';

export default async function PlatformModulesSection() {
  const flags = await getModuleFlags();

  const enabledMap: Record<string, boolean> = {};
  for (const key of MODULE_KEYS) {
    enabledMap[key] = flags[key] ?? true;
  }

  return <PlatformModulesGrid enabledMap={enabledMap} />;
}
