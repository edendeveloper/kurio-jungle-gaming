import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const directory = process.argv[2]
for (const file of (await readdir(directory)).filter((name) => name.endsWith('.report.json'))) {
  const report = JSON.parse(await readFile(path.join(directory, file), 'utf8'))
  const issues = Object.values(report.audits)
    .filter((audit) => audit.score !== null && audit.score < 0.9 && audit.scoreDisplayMode !== 'informative')
    .map(({ id, score, displayValue, title }) => ({ id, score, displayValue, title }))
  console.log(`\n${file}\n${JSON.stringify(issues, null, 2)}`)
}
