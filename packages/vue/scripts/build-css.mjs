import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
mkdirSync(join(here, '..', 'dist'), { recursive: true })
copyFileSync(join(here, '..', 'src', 'style.css'), join(here, '..', 'dist', 'style.css'))
console.log('copied style.css to dist')
