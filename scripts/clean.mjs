import { rm } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const roots = ['packages', 'apps']
for (const root of roots) {
  for (const entry of await readdir(new URL('../' + root, import.meta.url), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    await rm(new URL('../' + root + '/' + entry.name + '/dist', import.meta.url), {
      recursive: true,
      force: true,
    })
  }
}
console.log('cleaned dist directories')
