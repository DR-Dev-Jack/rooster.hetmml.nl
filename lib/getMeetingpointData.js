/* 16-11-2021 URL Change: http://www.meetingpointmco.nl/Roosters-AL/doc/ changed to: https://mmlrooster.msa.nl */
/* 16-11-2021 URL Change: http://www.meetingpointmco.nl/Roosters-AL/TOSweb changed to: https://kiemmrooster.msa.nl */
'use strict'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const Promise = require('bluebird')
const cheerio = require('cheerio')
const _ = require('lodash')
const httpntlm = require('httpntlm')

let meetingpointData
let lastUpdate

function getUsers (page) {
  const script = page('script').eq(1).text()
  const regexs = [/var classes = \[(.+)\];/, /var teachers = \[(.+)\];/, /var rooms = \[(.+)\];/, /var students = \[(.+)\];/]
  const items = regexs.map(function (regex) {
    const match = script.match(regex)

    if (!match) {
      return []
    }

    return match[1].split(',').map(function (item) {
      return item.replace(/"/g, '')
    })
  })

  return []
  .concat(items[0].map(function (item, index) {
    return {
      type: 'c',
      value: item,
      index: index
    }
  }))
  .concat(items[1].map(function (item, index) {
    return {
      type: 't',
      value: item,
      index: index
    }
  }))
  .concat(items[2].map(function (item, index) {
    return {
      type: 'r',
      value: item,
      index: index
    }
  }))
  .concat(items[3].map(function (item, index) {
    return {
      type: 's',
      value: item,
      index: index
    }
  }))
}

function getValidWeekNumbers(page) {
  const weekSelector = page('select[name="week"]');
  const weekNumbers = _.map(weekSelector.children(), option => parseInt(option.attribs.value))

  return weekNumbers;
}

function requestData() {
  lastUpdate = new Date()

  const url = process.env.SCHOOL_LEVEL === 'mavo'
    ? 'https://kiemmrooster.msa.nl/dagroosters/frames/navbar.htm'
    : 'https://mmlrooster.msa.nl/dagroosters/frames/navbar.htm'

  console.log('Requesting:', url)

  return new Promise((resolve, reject) => {
    httpntlm.get({
      url: url,
      username: process.env.username,
      password: process.env.password,
      domain: 'MCO',
      workstation: 'ROOSTER',
      strictSSL: false,
      rejectUnauthorized: false
    }, function (err, response) {
      if (err) {
        console.error('NTLM request failed:', err)
        reject(err)
        return
      }

      console.log('Upstream status:', response.statusCode)

      if (response.statusCode !== 200) {
        console.error('Upstream returned:', response.statusCode)
        console.error(response.body)
        reject(new Error(`Upstream returned HTTP ${response.statusCode}`))
        return
      }

      const page = cheerio.load(response.body)

      console.log('Successfully received upstream HTML')

      const users = getUsers(page)
      console.log('Users:', users)

      const validWeekNumbers = getValidWeekNumbers(page)

      meetingpointData = {
        users,
        validWeekNumbers
      }

      resolve(meetingpointData)
    })
  })
}


function getMeetingpointData () {
  if (lastUpdate == null || new Date() - lastUpdate > 10 * 60 * 1000) { // 10 minutes
    return requestData()
  } else if (!meetingpointData) {
    return Promise.reject()
  } else {
    return Promise.resolve(meetingpointData)
  }
}

module.exports = getMeetingpointData
