const cheerio = require('cheerio')
const {
  bookFile,
  downloadAllBooks,
  downloadBook,
  downloadUrls,
  fileext,
  parseBookFiles,
  parseBookshelf,
  scheduleBookDownload
} = require('./connector')

const whatever = {}

const bookshelfHtml = `
  ...
    <div class="book-shelf ...">
      ...
      <div class="book-item ...">
        <div class="...">
          <a href="https://pragprog.com/downloads/1111111">
            <img class="book-cover ..." src="https://imagery.pragprog.com/products/111/book1_largecover.jpg?..." ...>
          </a>
        </div>
        <div class="...">
          <h2>Book 1 (eBook)</h2>
          <h3>by Author X</h3>
          <ul class="details ...">
            <li>
              Current version:
              <a href="/titles/book1/release_info" title="Book 1" ...>P1.0</a>
            </li>
          </ul>
          <ul class="item-details ...">
            <li><a href="...">...</a></li>
            <li> | </li>
            ...
            <li><a href="https://pragprog.com/downloads/1111111">Download eBook</a></li>
            <li> | </li>
          </ul>
          ...
        </div>
      </div>
      <div class="book-item ...">
        <div class="columns ...">
          <a href="https://pragprog.com/downloads/2222222">
            <img class="book-cover ..." src="https://imagery.pragprog.com/products/222/book2_largecover.jpg?..." ...>
          </a>
        </div>
        <div class="columns ...">
          <h2>Book 2 (eBook)</h2>
          <h3>by Author Y</h3>
          <ul class="details ...">
            <li>
              Current version:
              <a href="/titles/book2/release_info" title="Book 2" ...>P2.0</a>
            </li>
          </ul>
          <ul class="item-details ...">
            <li><a href="...">...</a></li>
            <li> | </li>
            ...
            <li><a href="https://pragprog.com/downloads/2222222">Download eBook</a></li>
            <li> | </li>
          </ul>
        </div>
      </div>
    </div>
  ...
`

const downloadOptionsHtml = `
  <div class="...">
    <h2>Download Options</h2>
    <a href="https://pragprog.com/downloads/111/whatever/book1-p-00.epub" ...>
      epub (for iPhone/iPad, Android, eReaders) (5.57 MB)
    </a>
    <a href="https://pragprog.com/downloads/111/whatever/book1-p-00.mobi" ...>
      mobi (for Kindle) (10.6 MB)
    </a>
    <a href="https://pragprog.com/downloads/111/whatever/book1-p-00.pdf" ...>
      PDF (6.73 MB)
    </a>
    ...
  </div>
`

const downloadPageRegeneratingHtml = `
  ...
    <div id="regen_status" ...>
      <p>Your ebooks for <emph>Book 1</emph> are not yet ready.</p>
      ...
    </div>
  ...
`

const downloadPageReadyHtml = `
  ...
    <div ...>
      <div ...>
        <h1>Book 1</h1>
          <a href="https://pragprog.com/book/book1/whatever">
            <img class="book-cover ..." src="https://imagery.pragprog.com/products/111/book1_xlargecover.jpg?..." ...>
          </a>

          <a href="/titles/book1/release_info" title="Book 1" ...>View Release History</a>
      </div>
      ${downloadOptionsHtml}
    </div>
  ...
`

describe('parseBookshelf', () => {
  let $

  beforeEach(() => {
    $ = cheerio.load(bookshelfHtml)
  })

  it('scrapes the books indexed by slug', () => {
    expect(parseBookshelf({ $ })).toEqual({
      booksBySlug: new Map([
        [
          'book1',
          {
            slug: 'book1',
            title: 'Book 1',
            version: 'P1.0',
            downloadPageUrl: 'https://pragprog.com/downloads/1111111'
          }
          // ],
          // [
          //   'book2',
          //   {
          //     slug: 'book2',
          //     title: 'Book 2',
          //     version: 'P2.0',
          //     downloadPageUrl: 'https://pragprog.com/downloads/2222222'
          //   }
        ]
      ])
    })
  })
})

describe('downloadAllBooks', () => {
  test('no books', () => {
    const booksBySlug = new Map()
    const downloadSteps = downloadAllBooks({ data: { booksBySlug } })
    expect(downloadSteps).toEqual([])
  })

  test('2 books', () => {
    const data = {
      booksBySlug: new Map([['foo', whatever], ['bar', whatever]])
    }
    expect(downloadAllBooks({ data })).toEqual([
      ['downloadBook', 'foo'],
      ['downloadBook', 'bar']
    ])
  })
})

describe('downloadBook', () => {
  test('returns 2 steps', () => {
    expect(downloadBook(whatever, 'qux')).toEqual([
      ['requestBookDownloadAvailability', 'qux'],
      ['scheduleBookDownload', 'qux']
    ])
  })
})

describe('downloadUrls', () => {
  let $

  beforeEach(() => {
    $ = cheerio.load(downloadOptionsHtml)
  })

  it('extracts the download URLs', () => {
    expect(downloadUrls($)).toEqual([
      'https://pragprog.com/downloads/111/whatever/book1-p-00.epub',
      'https://pragprog.com/downloads/111/whatever/book1-p-00.mobi',
      'https://pragprog.com/downloads/111/whatever/book1-p-00.pdf'
    ])
  })
})

describe('fileext', () => {
  const scenarios = [
    ['', ''],
    ['file', ''],
    ['file.', ''],
    ['.file', ''],
    ['file.ext', 'ext'],
    ['file.ext.ext2', 'ext2'],
    ['http://foo.bar/baz.qux', 'qux']
  ]

  scenarios.forEach(([fileurl, ext]) => {
    test(`${JSON.stringify(fileurl)} → ${JSON.stringify(ext)}`, () => {
      expect(fileext(fileurl)).toEqual(ext)
    })
  })
})

describe('bookFile', () => {
  const book = { title: 'Foo', version: '2.3' }
  const fileurl = 'foo.ext'
  let file

  beforeEach(() => {
    file = bookFile(book)(fileurl)
  })

  test('fileurl', () => {
    expect(file.fileurl).toEqual(fileurl)
  })

  test('filename', () => {
    expect(file.filename).toEqual('Foo — 2.3.ext')
  })
})

describe('scheduleBookDownload', () => {
  let $

  describe('when files are being (re)generated', () => {
    beforeEach(() => {
      $ = cheerio.load(downloadPageRegeneratingHtml)
    })

    it('returns nothing', () => {
      // TODO: instead, add slug to a set of books being regenerated
      expect(scheduleBookDownload({ $ })).toEqual(undefined)
    })
  })

  describe('when files are ready', () => {
    beforeEach(() => {
      $ = cheerio.load(downloadPageReadyHtml)
    })

    it('returns the necessary next steps', () => {
      expect(scheduleBookDownload({ $ })).toEqual([
        ['parseBookFiles', 'book1'],
        ['downloadAllFiles']
      ])
    })
  })
})

describe('parseBookFiles', () => {
  const book1 = { title: 'Book 1', version: 'P1.0' }
  const data = { booksBySlug: new Map([[book1.slug, book1]]) }
  let $

  beforeEach(() => {
    $ = cheerio.load(downloadPageReadyHtml)
  })

  it('scrapes the files in a saveFiles-compatible format', () => {
    expect(parseBookFiles({ data, $ })).toEqual({
      ...data,
      files: [
        {
          filename: 'Book 1 — P1.0.epub',
          fileurl: 'https://pragprog.com/downloads/111/whatever/book1-p-00.epub'
        },
        {
          filename: 'Book 1 — P1.0.mobi',
          fileurl: 'https://pragprog.com/downloads/111/whatever/book1-p-00.mobi'
        },
        {
          filename: 'Book 1 — P1.0.pdf',
          fileurl: 'https://pragprog.com/downloads/111/whatever/book1-p-00.pdf'
        }
      ]
    })
  })
})
