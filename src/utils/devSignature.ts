export const DEV_ASCII_ART = `
    ██████╗ ██╗   ██╗       ███╗   ███╗ █████╗ ███╗   ██╗██╗   ██╗███████╗██╗     
    ██╔══██╗╚██╗ ██╔╝██╗    ████╗ ████║██╔══██╗████╗  ██║██║   ██║██╔════╝██║     
    ██████╔╝ ╚████╔╝ ╚═╝    ██╔████╔██║███████║██╔██╗ ██║██║   ██║█████╗  ██║     
    ██╔══██╗  ╚██╔╝  ██╗    ██║╚██╔╝██║██╔══██║██║╚██╗██║██║   ██║██╔══╝  ██║     
    ██████╔╝   ██║   ╚═╝    ██║ ╚═╝ ██║██║  ██║██║ ╚████║╚██████╔╝███████╗███████╗
    ╚═════╝    ╚═╝          ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝╚══════╝
`;

export const DEV_CONTACT_MESSAGE =
  'For business inquiries, website development or other projects email me at macg022004@gmail.com / Para consultas de negocio, desarrollo de paginas web u otros proyectos por favor envie un correo a: macg022004@gmail.com';

/**
 * Prints the developer's signature and contact info to the browser console.
 * Formatted with kawaii aesthetic colors (--p5 pink and dark plum).
 */
export function printDevSignature(): void {
  const asciiStyle = [
    'color: #e68bbe',
    'font-weight: 900',
    'font-family: monospace',
    'font-size: 11px',
    'line-height: 1.15',
    'text-shadow: 1px 1px 0px #f9cee7',
  ].join(';');

  const messageStyle = [
    'color: #3d1a2e',
    'background: #fff0f7',
    'border: 2px solid #eea1cd',
    'border-radius: 8px',
    'padding: 8px 12px',
    'margin-top: 6px',
    'font-family: "Sour Gummy", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'font-size: 12px',
    'font-weight: 600',
    'line-height: 1.5',
    'display: inline-block',
  ].join(';');

  console.log(
    `%c${DEV_ASCII_ART}\n%c ${DEV_CONTACT_MESSAGE}`,
    asciiStyle,
    messageStyle
  );
}
