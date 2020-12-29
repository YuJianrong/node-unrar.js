/* eslint-disable @typescript-eslint/no-explicit-any */
interface module {
  RarArchive: any;
  extractor?: any;
}

export default function unrar(): Promise<module>;
