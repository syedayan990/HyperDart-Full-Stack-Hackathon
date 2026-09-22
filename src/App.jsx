import React, { useState } from 'react';
import { SearchRounded, TravelExploreRounded } from '@mui/icons-material';
import LeaveLens from './frontend/LeaveLens';
import './App.css';

const EXAMPLE_QUERIES = [
  'I have 2 leaves in India 2026',
  'Best long weekends in India 2026',
  'Find 4 day breaks in India 2026',
  'Best vacation with 1 leave in Japan 2026',
  'How many days off can I get with 3 leaves in the United States 2026?',
];

export default function App() {
  const [draft, setDraft] = useState(EXAMPLE_QUERIES[0]);
  const [query, setQuery] = useState(EXAMPLE_QUERIES[0]);

  const submit = (e) => {
    e?.preventDefault();
    if (draft.trim()) setQuery(draft.trim());
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <TravelExploreRounded fontSize="large" />
          <div>
            <h1>LeaveLens</h1>
            <p>Turn a few leave days into the longest break possible.</p>
          </div>
        </div>
        <form className="app-search" onSubmit={submit}>
          <SearchRounded fontSize="small" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. I have 2 leaves in India 2026"
            aria-label="Leave planning query"
          />
          <button type="submit">Search</button>
        </form>
        <div className="app-examples">
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              className="app-example-chip"
              onClick={() => {
                setDraft(example);
                setQuery(example);
              }}
            >
              {example}
            </button>
          ))}
        </div>
      </header>

      <main className="app-main">
        <LeaveLens searchData={{ query }} />
      </main>

      <footer className="app-footer">
        <span>Holiday data: Nager.Date, with a Tallyfy fallback and a small bundled emergency dataset.</span>
      </footer>
    </div>
  );
}
