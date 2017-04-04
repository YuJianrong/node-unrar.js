import {DataExtractor} from "./dataExtractor";
import {Extractor} from "./extractor";
import {FileExtractor} from "./fileExtractor";

export function createExtractorFromData(data: ArrayBuffer, password: string = ""): Extractor {
  return new DataExtractor(data, password);
}
export function createExtractorFromFile(filepath: string, password: string = ""): Extractor {
  return new FileExtractor(filepath, password);
}
