const getMaxTokenBalance = async (tokenContract, accountAddress) => {
  const balance = await tokenContract.methods.balanceOf(accountAddress).call()
  return balance
}

module.exports = getMaxTokenBalance
