const {
  log,
  requestFactory,
  saveFiles,
  scrape,
  signin
} = require('cozy-konnector-libs')
const fp = require('./fp')
const hidePassword = require('./fp/hidePassword')

const { NODE_ENV } = process.env

const request = requestFactory({
  cheerio: true,
  json: false,
  jar: true
})

/* istanbul ignore next */
const authenticate = ({ fields }) => {
  return signin({
    url: `https://pragprog.com/login`,
    formSelector: '#new_login_info',
    formData: {
      'login_info[email]': fields.login,
      'login_info[password]': fields.password()
    }
  })
}

/* istanbul ignore next */
const requestBookshelf = () => request('https://pragprog.com/my_bookshelf')

const parseBookshelf = ({ data, $ }) => {
  let books = scrape(
    $,
    {
      slug: {
        sel: '.details a',
        attr: 'href',
        parse: href => href.split('/')[2]
      },
      title: { sel: '.details a', attr: 'title' },
      version: '.details a',
      downloadPageUrl: {
        sel: '.item-details a',
        fn: $links => $links.last().attr('href')
      }
    },
    '.book-item'
  )
  books = [books[0]] // FIXME

  return {
    ...data,
    booksBySlug: new Map(books.map(book => [book.slug, book]))
  }
}

// TODO: Download outdated books only
const downloadAllBooks = ({ data: { booksBySlug } }) =>
  Array.from(booksBySlug.keys()).map(slug => ['downloadBook', slug])

const downloadBook = (context, slug) => [
  ['requestBookDownloadAvailability', slug],
  ['scheduleBookDownload', slug]
]

/* istanbul ignore next */
const requestBookDownloadAvailability = ({ data: { booksBySlug } }, slug) =>
  request(booksBySlug.get(slug).downloadPageUrl)

const downloadUrls = $ =>
  $('h2:contains("Download Options")')
    .siblings('a')
    .get()
    .map(({ attribs: { href } }) => href)

const fileext = fileurl => {
  const index = fileurl.lastIndexOf('.')
  if (index <= 0) {
    return ''
  } else {
    return fileurl.substr(index + 1)
  }
}

const bookFile = book => fileurl => ({
  fileurl,
  filename: `${book.title} — ${book.version}.${fileext(fileurl)}`
})

const findBook = (data, slug) => data.booksBySlug.get(slug)

const scheduleBookDownload = ({ $ }, slug) => {
  if ($('#regen_status').length > 0) {
    log(
      'info',
      `Files for ${slug} are being (re)generated.` +
        ' They will be downloaded on next connector run.'
    )
  } else {
    return [['parseBookFiles', slug], ['downloadAllFiles']]
  }
}

const parseBookFiles = ({ data, $ }, slug) => {
  const book = findBook(data, slug)
  const fileurls = downloadUrls($)
  return { ...data, files: fileurls.map(bookFile(book)) }
}

/* istanbul ignore next */
const downloadAllFiles = ({ data: { files }, fields }) =>
  saveFiles(files, fields)

const connector = fp.connector({
  initial: {
    data: { booksBySlug: new Map(), files: [] },
    steps: [
      hidePassword,
      authenticate,
      requestBookshelf,
      parseBookshelf,
      downloadAllBooks
    ]
  },
  stepsByName: {
    downloadBook,
    requestBookDownloadAvailability,
    scheduleBookDownload,
    parseBookFiles,
    downloadAllFiles
  }
})

// TODO: Start REPL after connector run
/* istanbul ignore next */
if (NODE_ENV === 'standalone') {
  const startRepl = require('./fp/startRepl')
  startRepl(connector)
}

module.exports = {
  bookFile,
  connector,
  downloadAllBooks,
  downloadBook,
  downloadUrls,
  fileext,
  parseBookFiles,
  parseBookshelf,
  scheduleBookDownload
}
