import './thoughts.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThoughtsApp } from './thoughts/ThoughtsApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThoughtsApp />
  </StrictMode>,
);
