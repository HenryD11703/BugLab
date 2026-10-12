import Link from "next/link";

export function Wordmark() {
  return (
    <Link className="wordmark" href="/" aria-label="BugLab, home">
      BugLab
    </Link>
  );
}

export const GITHUB_URL = "https://github.com/HenryD11703/BugLab";

export default function SiteHeader() {
  return (
    <header className="bar">
      <div className="wrap">
        <Wordmark />
        <nav className="nav" aria-label="Main">
          <Link href="/#exercises">exercises</Link>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            github ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
