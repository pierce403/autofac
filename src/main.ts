import './styles.css';
import { renderAppShell } from './app';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('App root not found');
}

root.innerHTML = renderAppShell();
