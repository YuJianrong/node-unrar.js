import { Extractor } from './js/Extractor';
import { ExtractorData } from './js/ExtractorData';
import { getUnrar } from './js/unrar.singleton';
export * from './js/Extractor';

export interface ExtractorFromDataOptions {
  wasmBinary?: ArrayBuffer;
  data: ArrayBuffer;
  password?: string;
}

export async function createExtractorFromData({
  wasmBinary,
  data,
  password = '',
}: ExtractorFromDataOptions): Promise<Extractor<Uint8Array>> {
  const unrar = await getUnrar(wasmBinary && { wasmBinary });
  const extractor = new ExtractorData(unrar, data, password);
  unrar.extractor = extractor;
  return extractor;
}
