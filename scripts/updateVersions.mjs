/* eslint-disable @typescript-eslint/no-var-requires */

import fetch from 'node-fetch';
import { format } from 'prettier';
import { writeFile } from 'fs/promises';

(async () => {
  const res = await fetch(
    'https://piston-meta.mojang.com/mc/game/version_manifest.json'
  );

  if (!res.ok) {
    console.error('Failed to fetch version manifest!');
    process.exit(1);
  }

  const data = await res.json();

  const versions = data.versions
    .filter((v) => v.type === 'release')
    .map((v) => v.id);

  await writeFile(
    './src/lib/minecraftVersions.json',
    format(JSON.stringify(versions), { parser: 'json' })
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
