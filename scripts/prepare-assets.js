import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('frontend/public', { recursive: true });
for (const name of ['model.json', 'reference.json']) await copyFile(`web/${name}`, `frontend/public/${name}`);
await cp('web/assets', 'frontend/public/assets', { recursive: true });
