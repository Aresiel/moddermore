import { parse } from '@iarna/toml';
import type JSZip from 'jszip';
import pLimit from 'p-limit';
import { parseModFolder } from './parseModFolder';

import type { Mod } from '~/types/moddermore';
import type { ModPwToml } from '~/types/packwiz';
import type { SetStateFn } from '~/types/react';

interface InputData {
  f: JSZip;
  setProgress: SetStateFn<{
    value: number;
    max: number;
  }>;
}

const parsePackwizTOML = (toml: string): Mod | null => {
  const { update: updateInfo } = parse(toml) as unknown as ModPwToml;

  if (!updateInfo) {
    console.error('no update info found');
    return null;
  }

  if (updateInfo.modrinth) {
    return { id: updateInfo.modrinth['mod-id'], provider: 'modrinth' };
  } else if (updateInfo.curseforge) {
    return {
      id:
        typeof updateInfo.curseforge['project-id'] === 'number'
          ? `${updateInfo.curseforge['project-id']}`
          : updateInfo.curseforge['project-id'],
      provider: 'curseforge',
    };
  }

  console.error('no update info found in `update`');

  return null;
};

export const parsePolyMCInstance = async ({ f, setProgress }: InputData) => {
  const mcFolder = f.folder('.minecraft');

  if (!mcFolder) {
    throw new Error('no .minecraft folder exists!');
  }

  const modFolder = mcFolder.folder('mods');

  if (!modFolder) {
    throw new Error('no mod folder exists!');
  }

  const pwIndexDir = modFolder.folder('.index');

  if (pwIndexDir) {
    console.log('.index folder detected, using packwiz format');

    const mods = Object.keys(pwIndexDir.files).filter((fn) =>
      fn.endsWith('toml')
    );

    console.log({ mods });

    const ret: (Mod | null)[] = [];
    setProgress({ value: 0, max: mods.length });

    const resolveLimit = pLimit(4);

    await Promise.all(
      mods.map((mod) =>
        resolveLimit(async () => {
          try {
            const modFile = await pwIndexDir.files[mod].async('text');
            console.log({ mod, modFile });
            ret.push(parsePackwizTOML(modFile));
          } catch (e) {
            console.error(e);
          }

          setProgress((oldVal) => ({
            value: oldVal.value + 1,
            max: oldVal.max,
          }));
        })
      )
    );

    return ret;
  }

  console.warn('no .index folder, falling back to mod folder');

  return await parseModFolder({ f: modFolder, setProgress });
};
