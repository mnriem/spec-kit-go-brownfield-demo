import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/dashboard.css';

const rootDOM = document.getElementById('root');
if (rootDOM) {
    const root = createRoot(rootDOM);
    root.render(<App />);
}
