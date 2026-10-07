import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Env as ColocEnv } from '../src/index';

declare global {
  namespace Cloudflare {
    interface Env extends ColocEnv {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
