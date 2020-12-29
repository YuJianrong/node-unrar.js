/* eslint-disable @typescript-eslint/no-explicit-any */
import unrarFactory from './unrar';

let unrar: any;

export async function getUnrar(): Promise<any> {
  if (!unrar) {
    unrar = await unrarFactory();
  }
  return unrar;
}
