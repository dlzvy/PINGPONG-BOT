require('dotenv').config()
const contractABI = require('../abi/contract-abi')
const kleur = require('kleur')
const sleep = require('../utils/sleep')
const getClaimData = require('../utils/get-claim-data')

async function sendClaimTransaction(claim, userAccount, contract, web3) {
  const claimData = {
    id: claim.mint_id,
    amount: claim.amount,
    signature: claim.signature,
  }

  const data = contract.methods.claim(claimData).encodeABI()

  const tx = {
    from: userAccount.address,
    to: contract.options.address,
    gas: 2000000,
    data: data,
  }

  try {
    const receipt = await web3.eth.sendTransaction(tx)

    console.log(
      kleur.green(
        `Claimed ${web3.utils.fromWei(claim.amount, 'ether')} token for mint id ${claim.mint_id} successfully`
      )
    )
    console.log(
      kleur.blue('Transaction hash:'),
      kleur.yellow(`https://holesky.etherscan.io/tx/${receipt.transactionHash}`)
    )
  } catch (error) {
    if (error.message === 'Transaction has been reverted by the EVM') {
      console.error(
        kleur.red(`Error sending claim transaction for mint id ${claim.mint_id}: Token already claimed on this day`)
      )
    } else {
      console.error(kleur.red(`Error sending claim transaction for mint id ${claim.mint_id}: ${error.message}`))
    }
  }
}

async function autoClaim(userAccount, web3) {
  const contractAddress = '0x0888e9E350ae4ac703e1e78341B180A007C15105'
  const contract = new web3.eth.Contract(contractABI, contractAddress)

  const claims = await getClaimData(userAccount.bearerToken)
  for (const claim of claims) {
    await sendClaimTransaction(claim, userAccount, contract, web3)
    await sleep(5000)
  }
}

module.exports = autoClaim
