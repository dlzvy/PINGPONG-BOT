const Web3 = require('web3').Web3
const kleur = require('kleur')
const { Listr } = require('listr2')
const stakeABI = require('../abi/stake-abi')
const getMaxTokenBalance = require('../utils/get-max-token-balance')
const approveToken = require('../utils/approve-token')

require('dotenv').config()

const web3 = new Web3('https://rpc-quicknode-holesky.morphl2.io/')

const contractAddressList = [
  {
    name: 'ppGRT',
    address: '0xaEBc89aFF5ad69D7Cf8B85C54D394Ad34D9c46bb',
    mapped: '0xb17bE239cf3C15b33CB865D4AcE5e28aa883440B',
  },
  {
    name: 'ppLPT',
    address: '0x7d9F7399951C96C83dF20C4839cFcD1e79C9d7f6',
    mapped: '0x0d763880cc7E54749E4FE3065DB53DA839a8eF6b',
  },
]

const autoStake = async (contract, contractInfo, account) => {
  try {
    const tokenContract = new web3.eth.Contract(stakeABI, contractInfo.mapped)
    const maxBalance = await getMaxTokenBalance(tokenContract, account.address)

    if (BigInt(maxBalance) <= 0n) {
      console.log(kleur.yellow(`No balance to stake for ${contractInfo.name}. Skipping...`))
      return
    }

    const amountToStake = (BigInt(maxBalance) * 100n) / 100n

    const approveResult = await approveToken(
      web3,
      account,
      contractInfo.mapped,
      amountToStake.toString(),
      contractInfo.address,
      'stake'
    )
    if (!approveResult.success) {
      console.error(kleur.red(`Approval failed for ${contractInfo.name} with address ${account.address} for staking`))
      return
    }

    const data = contract.methods.deposit(amountToStake.toString(), account.address).encodeABI()

    const txCount = await web3.eth.getTransactionCount(account.address)
    const gasPrice = await web3.eth.getGasPrice()
    const gasLimit = await contract.methods
      .deposit(amountToStake.toString(), account.address)
      .estimateGas({ from: account.address })

    const txObject = {
      nonce: web3.utils.toHex(txCount),
      to: contract.options.address,
      value: '0x0',
      gasLimit: web3.utils.toHex(gasLimit),
      gasPrice: web3.utils.toHex(gasPrice),
      data: data,
    }

    const tasks = new Listr([
      {
        title: 'Approving Transaction',
        task: async (ctx, task) => {
          ctx.signedTx = await web3.eth.accounts.signTransaction(txObject, account.privateKey)
          task.title = kleur.green('Transaction Approved')
        },
      },
      {
        title: 'Sending Transaction',
        task: async (ctx, task) => {
          ctx.receipt = await web3.eth.sendSignedTransaction(ctx.signedTx.rawTransaction)
          task.title = kleur.green('Transaction Sent')
        },
      },
    ])

    const ctx = await tasks.run()
    console.log(
      kleur.blue('Transaction hash:'),
      kleur.yellow(`https://explorer-holesky.morphl2.io/tx/${ctx.receipt.transactionHash}`)
    )
  } catch (error) {
    console.error(kleur.red(`Failed to stake ${contractInfo.name} with error: ${error.message}`))
  }
}

const executeStaking = async (userAccount) => {
  console.log(kleur.bold().blue(`\n===========================`))
  console.log(kleur.bold().blue(`  STAKING WITH ADDRESS: ${userAccount.address}`))
  console.log(kleur.bold().blue(`===========================`))
  for (const contractInfo of contractAddressList) {
    console.log(kleur.bold().green(`\nStaking ${contractInfo.name}`))
    const contract = new web3.eth.Contract(stakeABI, contractInfo.address)
    await autoStake(contract, contractInfo, userAccount)
  }
  console.log(kleur.bold().blue('\nRechecking balances and retrying staking...'))
  for (const contractInfo of contractAddressList) {
    console.log(kleur.bold().green(`\nRechecking and staking ${contractInfo.name}`))
    const contract = new web3.eth.Contract(stakeABI, contractInfo.address)
    await autoStake(contract, contractInfo, userAccount)
  }
}

module.exports = executeStaking
