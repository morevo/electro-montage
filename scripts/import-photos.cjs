const fs = require('fs')
const path = require('path')

const SRC_ROOT = path.resolve(__dirname, '..', '..', '..', '..', 'Фото для добавления')
const PORTFOLIO_SRC = path.join(SRC_ROOT, 'Примеры работ')
const ABOUT_SRC = path.join(SRC_ROOT, 'О компании')

const DEST_ROOT = path.resolve(__dirname, '..', 'src', 'assets')
const PORTFOLIO_DEST = path.join(DEST_ROOT, 'portfolio')
const ABOUT_DEST = path.join(DEST_ROOT, 'about')

const FOLDER_TO_SLUG = {
  'Подключение к электросетям': 'podklyuchenie',
  'Электропроводка': 'provodka',
  'Уличное освещение': 'osveshchenie',
  'Заземление': 'zazemlenie',
  'Видеонаблюдение': 'videonablyudenie',
}

const translitMap = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
}

function translit(str) {
  return str
    .toLowerCase()
    .split('')
    .map((ch) => translitMap[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

// Извлекает человекочитаемое название из исходного имени файла вида
// "Категория X Название фото Y (N).jpg"
function extractTitle(filename) {
  const base = filename.replace(/\.[^.]+$/, '')
  let title = base.replace(/^Категория[\s.-]+.*?Название[\s.-]*(фотографий|фотографии|фото)?[\s.-]*/iu, '')
  title = title.replace(/\s*\(\d+\)\s*$/, '').trim()
  if (!title) title = base
  return title
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

// В исходных папках встречаются фото не своей категории (например, "Скрытая электропроводка"
// лежала в папке "Уличное освещение"). Определяем категорию по смыслу названия фото,
// а не по папке — так фото попадают в правильный раздел независимо от того, куда их положили.
function categoryFromTitle(title, folderFallback) {
  const t = title.toLowerCase()
  if (t.includes('электропроводка') || t.includes('щит')) return 'Электропроводка'
  if (t.includes('фонарь') || t.includes('освещен')) return 'Уличное освещение'
  if (t.includes('вру') || t.includes('трубостойк')) return 'Подключение к электросетям'
  if (t.includes('заземлен')) return 'Заземление'
  return folderFallback
}

// Минимальный парсер размеров JPEG/PNG без внешних зависимостей —
// react-photo-album раскладывает ряды по реальным пропорциям, иначе фото обрезаются криво.
function getImageSize(filePath) {
  const buf = fs.readFileSync(filePath)
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2
    while (offset < buf.length) {
      if (buf[offset] !== 0xff) {
        offset++
        continue
      }
      const marker = buf[offset + 1]
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3) {
        const height = buf.readUInt16BE(offset + 5)
        const width = buf.readUInt16BE(offset + 7)
        return { width, height }
      }
      const segmentLength = buf.readUInt16BE(offset + 2)
      offset += 2 + segmentLength
    }
  } else if (buf[0] === 0x89 && buf[1] === 0x50) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  }
  return { width: 4, height: 3 }
}

// Собираем все фото из всех папок вместе с их реальной (по названию) категорией —
// это позволяет перенести фото, ошибочно сложенные не в ту папку источника.
const collected = []
for (const folderName of Object.keys(FOLDER_TO_SLUG)) {
  const srcDir = path.join(PORTFOLIO_SRC, folderName)
  if (!fs.existsSync(srcDir)) continue
  const files = fs.readdirSync(srcDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  for (const file of files) {
    const title = extractTitle(file)
    const category = categoryFromTitle(title, folderName)
    collected.push({ srcPath: path.join(srcDir, file), title, category, ext: path.extname(file).toLowerCase() })
  }
}

const byCategory = new Map()
for (const item of collected) {
  const list = byCategory.get(item.category) ?? []
  list.push(item)
  byCategory.set(item.category, list)
}

const manifest = []
for (const [category, items] of byCategory) {
  const slug = FOLDER_TO_SLUG[category] ?? translit(category)
  const destDir = path.join(PORTFOLIO_DEST, slug)
  ensureDir(destDir)
  items.forEach((item, i) => {
    const destName = `${i + 1}-${translit(item.title) || 'foto'}${item.ext}`
    const destPath = path.join(destDir, destName)
    fs.copyFileSync(item.srcPath, destPath)
    const { width, height } = getImageSize(destPath)
    manifest.push({ category, title: item.title, file: `portfolio/${slug}/${destName}`, width, height })
  })
}

// О компании
ensureDir(ABOUT_DEST)
const aboutItems = []
if (fs.existsSync(ABOUT_SRC)) {
  const files = fs.readdirSync(ABOUT_SRC).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  files.forEach((file, i) => {
    const ext = path.extname(file).toLowerCase()
    const destName = `team-${i + 1}${ext}`
    const destPath = path.join(ABOUT_DEST, destName)
    fs.copyFileSync(path.join(ABOUT_SRC, file), destPath)
    const { width, height } = getImageSize(destPath)
    aboutItems.push({ file: `about/${destName}`, width, height })
  })
}

fs.writeFileSync(
  path.join(DEST_ROOT, 'portfolio-manifest.json'),
  JSON.stringify({ portfolio: manifest, about: aboutItems }, null, 2),
  'utf-8'
)

console.log(`Portfolio items: ${manifest.length}`)
console.log(`About items: ${aboutItems.length}`)
manifest.forEach((m) => console.log(`  [${m.category}] ${m.title} -> ${m.file}`))
