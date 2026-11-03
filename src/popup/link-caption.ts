const PROJECT_PATH = /^\/(?:orgs|users)\/[^/]+\/projects\/(\d+)/;

const REPOSITORY_PATH = /^\/([^/]+)\/([^/]+)/;

function parse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function linkCaption(url: string): string {
  const address = parse(url);
  if (!address) return "";
  const project = PROJECT_PATH.exec(address.pathname);
  if (project) return `Projekt ${project[1]}`;
  const repository = address.hostname === "github.com" ? REPOSITORY_PATH.exec(address.pathname) : null;
  if (repository) return `${repository[1]}/${repository[2]}`;
  return address.hostname;
}
