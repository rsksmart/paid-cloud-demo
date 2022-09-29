import express, { Request, Response } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'

import setupApp from '@rsksmart/express-did-auth'
import { SimpleSigner } from 'did-jwt'

import { providers } from 'ethers'
import { ServiceAgreement__factory } from '@paid-cloud/contracts/typechain-types/factories/ServiceAgreement__factory'

import TelegramBot from 'node-telegram-bot-api'

// Config
require('dotenv').config()

const privateKey = process.env.PRIVATE_KEY as string
const serviceDid = process.env.DID as string
const token = process.env.TELEGRAM_BOT_TOKEN as string

// Express setup
const app = express()
app.use(cors())
app.use(bodyParser.text())

// Express DID Auth setup
const serviceSigner = SimpleSigner(privateKey) as any
const challengeSecret = 'theSuperSecret'
const serviceUrl = 'http://localhost:3001'

const authMiddleware = setupApp({ challengeSecret, serviceUrl, serviceDid, serviceSigner })(app)

// Database
// user -> key -> value
const db: { [user: string]: { [key: string]: string } } = {}
const usedSpace: { [user: string]: number } = {}
const maxSpace = 500000

// Node connection
const serviceAgreement = ServiceAgreement__factory.connect(
  '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  new providers.WebSocketProvider('ws://localhost:8545')
)

const extractDID = (req: any) => req.user!.did

const validatePayment = (req: Request, res: Response) => {
  const user = extractDID(req)
  const userParts = user.split(':')
  const address = userParts[userParts.length - 1]
  return serviceAgreement.hasPaidCurrentPeriod(address).then(hasPaid => {
    if (!hasPaid) return res.status(402).send('Pay in the smart contract')
  })
}

// Bot setup
const bot = new TelegramBot(token, {polling: true});

// store chat id
let chatId = 0

bot.onText(/\/start/, (msg: any) => {
  chatId = msg.chat.id;
  bot.sendMessage(chatId, 'ok');
});

const main = async () => {
  // listen event PeriodPaid
  serviceAgreement.on('PeriodPaid', (user, period) => {
    bot.sendMessage(chatId, `${user} paid period ${period}`)
  })

  app.route('/:key')
    .get(authMiddleware, (req, res) => {
      const user = extractDID(req)
      validatePayment(req, res).then(() => {
        if (!db[user]) return res.status(200).send(null)
        console.log(user, req.params.key)
        console.log(db[user][req.params.key])
        res.status(200).send(db[user][req.params.key])
      })
    })
    .post(authMiddleware, (req, res) => {
      const user = extractDID(req)
      validatePayment(req, res).then(() => {
        const key: string = req.params.key
        const value: string = req.body

        if (!db[user]) { db[user] = {} }
        db[user][key] = value
        console.log(user, key, value)

        if (!usedSpace[user]) { usedSpace[user] = 0 }
        const nextUserUsedSpace = usedSpace[user] + key.length + value.length
        if (nextUserUsedSpace > maxSpace) return res.status(413).send('Size exceeded')
        usedSpace[user] = nextUserUsedSpace

        res.status(200).send()
      })
    })

  app.listen(3001, () => console.log('App started'))
}

main()
