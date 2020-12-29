import { Extractor } from './Extractor';
import { ExtractorData } from './ExtractorData';
import { ExtractorFile } from './ExtractorFile';
import { getUnrar } from './unrar.singleton';

export interface ExtractorFromDataOptions {
  data: ArrayBuffer;
  password?: string;
}
export async function createExtractorFromData({
  data,
  password = '',
}: ExtractorFromDataOptions): Promise<Extractor<Uint8Array>> {
  const unrar = await getUnrar();
  const extractor = new ExtractorData(unrar, data, password);
  unrar.extractor = extractor;
  return extractor;
}

export interface ExtractorFromFileOptions {
  filepath: string;
  targetPath?: string;
  password?: string;
}

export async function createExtractorFromFile({
  filepath,
  targetPath = '',
  password = '',
}: ExtractorFromFileOptions): Promise<Extractor> {
  const unrar = await getUnrar();
  const extractor = new ExtractorFile(unrar, filepath, targetPath, password);
  unrar.extractor = extractor;
  return extractor;
}
