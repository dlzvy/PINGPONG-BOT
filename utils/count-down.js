const readline = require('readline')
const sleep = require('./sleep')
const kleur = require('kleur')
const formatCountdown = require('./format-countdown')

async function countdown(duration, type) {
  const countdownEnd = Date.now() + duration

  const countdownInterval = setInterval(() => {
    const now = Date.now()
    const remainingTime = countdownEnd - now
    if (remainingTime <= 0) {
      clearInterval(countdownInterval)
      readline.clearLine(process.stdout, 0)
      readline.cursorTo(process.stdout, 0)
      process.stdout.write(kleur.green(`Starting ${type === 'bridge' ? 'bridging' : 'staking'}...\n`))
    } else {
      readline.cursorTo(process.stdout, 0)
      process.stdout.write(
        kleur.yellow(`Waiting for ${type === 'bridge' ? 'bridging' : 'staking'}: ${formatCountdown(remainingTime)}`)
      )
    }
  }, 1000)

  await sleep(duration)
}

module.exports = countdown
