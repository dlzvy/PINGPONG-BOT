const kleur = require('kleur')
const { Listr } = require('listr2')
const approveStakeABI = require('../abi/approve-abi')

async function approveToken(web3, account, tokenAddress, amount, contractAddress, type) {
  try {
    const tokenContract = new web3.eth.Contract(approveStakeABI, tokenAddress)
    const data = tokenContract.methods.approve(contractAddress, amount).encodeABI()

    const gasEstimate = await web3.eth.estimateGas({
      from: account.address,
      to: tokenAddress,
      data: data,
    })

    const gasPrice = await web3.eth.getGasPrice()

    const tx = {
      from: account.address,
      to: tokenAddress,
      data: data,
      gas: gasEstimate,
      gasPrice: gasPrice,
    }

    const tasks = new Listr([
      {
        title: 'Creating Approval Transaction',
        task: async (ctx, task) => {
          ctx.signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey)
          task.title = kleur.green('Approval Transaction Created')
        },
      },
      {
        title: 'Sending Approval Transaction',
        task: async (ctx, task) => {
          ctx.receipt = await web3.eth.sendSignedTransaction(ctx.signedTx.rawTransaction)
          task.title = kleur.green('Approval Transaction Sent')
        },
      },
    ])

    const ctx = await tasks.run()

    console.log(
      kleur.blue('Approval transaction hash:'),
      kleur.yellow(
        type === 'bridge'
          ? `https://holesky.etherscan.io/tx/${ctx.receipt.transactionHash}`
          : `https://explorer-holesky.morphl2.io/tx/${ctx.receipt.transactionHash}`
      )
    )

    return {
      success: true,
      txHash: ctx.receipt.transactionHash,
    }
  } catch (error) {
    console.error(kleur.red(`Error sending approval transaction:`), error.message)
    return {
      success: false,
      txHash: null,
    }
  }
}

module.exports = approveToken
