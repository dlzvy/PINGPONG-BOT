require('dotenv').config()
const Web3 = require('web3').Web3
const kleur = require('kleur')
const readline = require('readline')
const executeStaking = require('./service/stake')
const bridgeToken = require('./service/bridge')
const formatCountdown = require('./utils/format-countdown')
const countdown = require('./utils/count-down')
const sleep = require('./utils/sleep')
const autoClaim = require('./service/claim')

const web3 = new Web3('https://ethereum-holesky-rpc.publicnode.com/')

const { PRIVATE_KEYS, BEARER_TOKENS } = process.env
if (!PRIVATE_KEYS || PRIVATE_KEYS.length === 0 || !BEARER_TOKENS || BEARER_TOKENS.length === 0) {
  throw new Error('PRIVATE_KEYS or BEARER_TOKENS is not defined')
}

const privateKeys = JSON.parse(PRIVATE_KEYS)
const bearerTokens = JSON.parse(BEARER_TOKENS)

if (privateKeys.length !== bearerTokens.length) {
  throw new Error('Number of private keys and bearer tokens should match')
}

const accounts = privateKeys.map((key, index) => {
  const account = web3.eth.accounts.privateKeyToAccount(new Uint8Array(Buffer.from(key, 'hex')))
  web3.eth.accounts.wallet.add(account)
  account.bearerToken = bearerTokens[index]
  return account
})

const tokenAddressList = [
  {
    name: 'mGRT',
    address: '0x3E4511645086a6fabECbAf1c3eE152C067f0AedA',
  },
  {
    name: 'mLPT',
    address: '0xc144Bf0FF0Ff560784a881024ccA077ebaa5b163',
  },
]

async function main() {
  let successfulTxCount = 0
  let dayCount = 0

  while (true) {
    console.log(kleur.bold().blue(`\n===========================`))
    console.log(kleur.bold().blue(`  CLAIMING TOKEN  `))
    console.log(kleur.bold().blue(`===========================\n`))
    for (const account of accounts) {
      try {
        await autoClaim(account, web3)
      } catch (error) {
        console.error(kleur.red(`Error during autoClaim for account ${account.address}: ${error.message}`))
      }
    }

    console.log(kleur.green('Waiting for 5 minutes before starting bridging...'))
    const fiveMinutes = 5 * 60 * 1000
    await countdown(fiveMinutes, 'bridge')

    for (const account of accounts) {
      for (const token of tokenAddressList) {
        try {
          const { success, txHash } = await bridgeToken(account, token.address, account.address, successfulTxCount)
          if (success) {
            successfulTxCount++
            const currentTime = new Date().toLocaleString()
            console.log(
              kleur.green(
                `[${currentTime}] Transaction ${successfulTxCount} successful for ${token.name} with address ${
                  account.address
                } on day ${dayCount + 1}`
              )
            )
          }
        } catch (error) {
          console.error(
            kleur.red(`Error during bridging for account ${account.address} and token ${token.name}: ${error.message}`)
          )
        }
      }
      await sleep(2000)
    }

    console.log(kleur.green('Waiting for 5 minutes before starting staking...'))
    await countdown(fiveMinutes, 'stake')

    for (const account of accounts) {
      try {
        await executeStaking(account)
      } catch (error) {
        console.error(kleur.red(`Error during staking for account ${account.address}: ${error.message}`))
      }
    }

    successfulTxCount = 0
    dayCount++

    const countdownStart = Date.now()
    const countdownEnd = countdownStart + 24 * 60 * 60 * 1000 + 5000

    const countdownInterval = setInterval(() => {
      const now = Date.now()
      const remainingTime = countdownEnd - now
      if (remainingTime <= 0) {
        clearInterval(countdownInterval)
        console.log(kleur.green('Starting the next cycle...'))
      } else {
        readline.cursorTo(process.stdout, 0)
        process.stdout.write(kleur.yellow(`Waiting for the next transaction: ${formatCountdown(remainingTime)}`))
      }
    }, 1000)

    await new Promise((resolve) => setTimeout(resolve, 24 * 60 * 60 * 1000 + 5000))
  }
}

main()
  .then(() => console.log('Main process completed'))
  .catch(console.error)
