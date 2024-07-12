const { default: axios } = require('axios')
const kleur = require('kleur')

async function getClaimData(token) {
  try {
    const response = await axios.get('https://api.markets.stake.pingpong.build/faucet/claim', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data.data
  } catch (error) {
    console.error(kleur.red(`Error getting claim data: ${error.response.status} ${error.response.statusText}`))
    return []
  }
}

module.exports = getClaimData
