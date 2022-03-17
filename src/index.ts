import { Extractor } from './js/Extractor';
import { ExtractorFile } from './js/ExtractorFile';
import { getUnrar } from './js/unrar.singleton';
export * from './index.esm';

export interface ExtractorFromFileOptions {
  wasmBinary?: ArrayBuffer;
  filepath: string;
  targetPath?: string;
  password?: string;
  filenameTransform?: (filename: string) => string;
}

export async function createExtractorFromFile({
  wasmBinary,
  filepath,
  targetPath = '',
  password = '',
  filenameTransform = (filename: string) => filename,
}: ExtractorFromFileOptions): Promise<Extractor> {
  const unrar = await getUnrar(wasmBinary && { wasmBinary });
  const extractor = new ExtractorFile(unrar, filepath, targetPath, password, filenameTransform);
  unrar.extractor = extractor;
  return extractor;
}
