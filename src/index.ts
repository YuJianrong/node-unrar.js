import { Extractor } from './js/Extractor';
import { ExtractorFile } from './js/ExtractorFile';
import { getUnrar } from './js/unrar.singleton';
export * from './index.esm';

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
