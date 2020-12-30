/* eslint-disable @typescript-eslint/no-explicit-any */
import unrarFactory from './unrar';

let unrar: any;

export async function getUnrar(options?: { wasmBinary?: ArrayBuffer }): Promise<any> {
  if (!unrar) {
    unrar = await unrarFactory(options);
  }
  return unrar;
}
