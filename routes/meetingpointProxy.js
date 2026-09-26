const express = require('express')
const router = express.Router()
const httpntlm = require('httpntlm')
const iconv = require('iconv-lite')

const username = process.env.username
const password = process.env.password
const domain = 'MCO'

router.get('/:url', function (req, res, next) {
  const baseURL = process.env.SCHOOL_LEVEL === 'mavo'
    ? 'https://kiemmrooster.msa.nl'
    : 'https://mmlrooster.msa.nl'

  const url = `${baseURL}/${req.params.url}`

  console.log('Proxy requesting:', url)

  httpntlm.get({
    url: url,
    username: username,
    password: password,
    domain: domain,
    workstation: 'ROOSTER',
    strictSSL: false,
    rejectUnauthorized: false
  }, function (err, data) {
    if (err) {
      console.error('Meetingpoint proxy error:', err)
      next(err)
      return
    }

    console.log('Proxy upstream status:', data.statusCode)

    const utf8Body = iconv.decode(
      Buffer.from(data.body),
      'ISO-8859-1'
    )

    res.status(data.statusCode).end(utf8Body)
  })
})

module.exports = router