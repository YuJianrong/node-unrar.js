import './index.css';
import { createExtractorFromData, UnrarError } from 'node-unrar-js';

async function readImage(file: File) {
  return new Promise<ArrayBuffer>((r) => {
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
      r(event.target?.result as ArrayBuffer);
    });
    reader.readAsArrayBuffer(file);
  });
}

function fillTemplate(
  template: string,
  parameters: { [key: string]: number | string | boolean },
): HTMLDivElement {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const domTemplate = document
    .querySelector<HTMLDivElement>(`#template-${template}`)!
    .cloneNode(true) as HTMLDivElement;
  for (const [key, val] of Object.entries(parameters)) {
    const span = domTemplate.querySelector<HTMLSpanElement>(`.${key}`);
    if (span) {
      span.innerHTML = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val);
    }
  }
  domTemplate.removeAttribute('id');
  return domTemplate;
}

document.querySelector<HTMLDivElement>('#file')?.addEventListener(
  'change',
  async (ev) => {
    try {
      const input = ev.target as HTMLInputElement;
      if (!input.files?.length) {
        return;
      }
      const data = await readImage(input.files[0]);
      const wasmBinary = await (
        await fetch('/assets/unrar.wasm', { credentials: 'same-origin' })
      ).arrayBuffer();

      const extractor = await createExtractorFromData({ wasmBinary, data });
      const { arcHeader, fileHeaders } = extractor.getFileList();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const filesDom = document.querySelector<HTMLDivElement>('.box')!;
      [...filesDom.childNodes].forEach((node) => filesDom.removeChild(node));

      filesDom.appendChild(fillTemplate('arc-header', { archiveComment: arcHeader.comment }));

      const fileHeaderList = [...fileHeaders];
      fileHeaderList.forEach((header) =>
        filesDom.appendChild(
          fillTemplate('file-header', {
            fileName: header.name,
            fileComment: header.comment,
            unpSize: header.unpSize,
            encrypted: header.flags.encrypted,
          }),
        ),
      );

      const { files } = extractor.extract({ files: (fileHeader) => !fileHeader.flags.encrypted });
      const filesList = [...files];
      filesList.forEach((file) =>
        filesDom.appendChild(
          fillTemplate('content', {
            fileName: file.fileHeader.name,
            content: new TextDecoder('utf-8').decode(file.extraction),
          }),
        ),
      );
    } catch (err) {
      if (err instanceof UnrarError) {
        alert(`Unrar exception: Reason[${err.reason}], Message: [${err.message}]`);
      }
    }
  },
  false,
);
