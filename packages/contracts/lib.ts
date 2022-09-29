import { utils, BigNumber } from 'ethers'

export const cost = utils.parseEther('0.00001')
export const getCurrentPeriod = () => BigNumber.from(Date.now()).div(1000 * 60 * 60 * 24 * 30)
