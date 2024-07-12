const kleur = require('kleur')
const { Listr } = require('listr2')
const contractABI = require('../abi/abi')
const approveToken = require('../utils/approve-token')
const Web3 = require('web3').Web3

const web3 = new Web3('https://ethereum-holesky-rpc.publicnode.com/')
const contractAddress = '0x7F82C801D1778fC42Df04c22f532C5B18bB3ba0F'
const contract = new web3.eth.Contract(contractABI, contractAddress)

async function bridgeToken(account, tokenAddress, toAddress, attempts = 0) {
  try {
    const check = web3.eth.abi.encodeFunctionCall(
      {
        name: 'balanceOf',
        type: 'function',
        inputs: [
          {
            type: 'address',
            name: '_owner',
          },
        ],
      },
      [account.address]
    )
    const balance = await web3.eth.call({
      to: tokenAddress,
      data: check,
    })

    if (BigInt(balance) <= 0n) {
      console.log(kleur.yellow(`No balance in account ${account.address} to bridge token ${tokenAddress}. Skipping...`))
      return {
        success: false,
        txHash: null,
      }
    }
    const amount = BigInt(balance).toString()

    const approveResult = await approveToken(web3, account, tokenAddress, amount, contractAddress, 'bridge')
    if (!approveResult.success) {
      console.error(kleur.red(`Approval failed for ${tokenAddress}`))
      return {
        success: false,
        txHash: null,
      }
    }

    const bridgeFee = web3.utils.toWei('0.0015', 'ether')
    const data = contract.methods.bridge(tokenAddress, toAddress, amount).encodeABI()

    const gasEstimate = await web3.eth.estimateGas({
      from: account.address,
      to: contractAddress,
      value: bridgeFee,
      data: data,
    })

    const tx = {
      from: account.address,
      to: contractAddress,
      value: bridgeFee,
      data: data,
      gas: gasEstimate,
      maxPriorityFeePerGas: web3.utils.toWei('2', 'gwei'),
      maxFeePerGas: web3.utils.toWei('100', 'gwei'),
    }

    const tasks = new Listr([
      {
        title: 'Signing Transaction',
        task: async (ctx, task) => {
          ctx.signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey)
          task.title = kleur.green('Transaction Signed')
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
      kleur.yellow(`https://holesky.etherscan.io/tx/${ctx.receipt.transactionHash}`)
    )
    return {
      success: true,
      txHash: ctx.receipt.transactionHash,
    }
  } catch (error) {
    console.error(kleur.red(`Error sending transaction (attempt ${attempts + 1}):`), error.message)
    return {
      success: false,
      txHash: null,
    }
  }
}

module.exports = bridgeToken
