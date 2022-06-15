import './index.css';
import { createExtractorFromData, UnrarError } from 'node-unrar-js';

async function readRarFile(file: File) {
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
      const data = await readRarFile(input.files[0]);

      const wasmBinary = await (
        await fetch('./assets/unrar.wasm', { credentials: 'same-origin' })
      ).arrayBuffer();

      const extractor = await createExtractorFromData({ wasmBinary, data });
      const { arcHeader, fileHeaders } = extractor.getFileList();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const filesDom = document.querySelector<HTMLDivElement>('.box')!;
      [...filesDom.childNodes].forEach((node) => filesDom.removeChild(node));

      filesDom.appendChild(fillTemplate('section-title', { title: 'Archive Header' }));
      filesDom.appendChild(fillTemplate('arc-header', { archiveComment: arcHeader.comment }));

      filesDom.appendChild(fillTemplate('section-title', { title: 'File Headers' }));
      for (const fileHeader of fileHeaders) {
        filesDom.appendChild(
          fillTemplate('file-header', {
            fileName: fileHeader.name,
            fileComment: fileHeader.comment,
            unpSize: fileHeader.unpSize,
            encrypted: fileHeader.flags.encrypted,
          }),
        );
      }

      filesDom.appendChild(fillTemplate('section-title', { title: 'File Contents' }));
      const { files } = extractor.extract({ files: (fileHeader) => !fileHeader.flags.encrypted });
      for (const file of files) {
        filesDom.appendChild(
          fillTemplate('content', {
            fileName: file.fileHeader.name,
            directory: file.fileHeader.flags.directory ? 'Yes' : 'No',
            content: file.extraction
              ? new TextDecoder('utf-8').decode(file.extraction)
              : '[No Content]',
          }),
        );
      }
    } catch (err) {
      if (err instanceof UnrarError) {
        alert(`Unrar exception: Reason[${err.reason}], Message: [${err.message}]`);
      }
    }
  },
  false,
);
