import { expect } from 'chai'
import { ethers } from 'hardhat'
import { ContractTransaction, Contract, BigNumberish } from 'ethers'
import { cost, getCurrentPeriod } from '../lib'

const setup = async () => {
  const ServiceAgreement = await ethers.getContractFactory('ServiceAgreement')
  const serviceAgreement = await ServiceAgreement.deploy()
  await serviceAgreement.deployTransaction.wait()
  const [paymentCollector, user, anotherUser, mallory] = await ethers.getSigners()
  return {
    serviceAgreement,
    paymentCollector, user, anotherUser, mallory
  }
}

const sendAndWait = (txPromise: Promise<ContractTransaction>) => txPromise.then(tx => tx.wait())

const payPeriod = (serviceAgreement: Contract, user: string, period: BigNumberish) => sendAndWait(
  serviceAgreement.payPeriod(user, period, { value: cost })
)

describe('Service Agreement', () => {
  it('allows to pay a period', async () => {
    const {
      serviceAgreement,
      user
    } = await setup()

    const period = 1

    await payPeriod(serviceAgreement.connect(user), user.address, period)

    expect(await serviceAgreement.hasPaidPeriod(user.address, period)).to.be.true
  })

  it('allows to collect payment', async () => {
    const {
      serviceAgreement,
      paymentCollector,
      user
    } = await setup()

    const period = 1

    await payPeriod(serviceAgreement.connect(user), user.address, period)

    const previousBalance = await paymentCollector.getBalance()

    const receipt = await sendAndWait(
      serviceAgreement.connect(paymentCollector).collectPayments()
    )

    const expectedBalance = previousBalance
      .sub(receipt.gasUsed.mul(receipt.effectiveGasPrice))
      .add(cost)

    expect(await paymentCollector.getBalance()).to.eq(expectedBalance)
  })

  it('determines if the current period was paid', async () => {
    const {
      serviceAgreement,
      user
    } = await setup()

    const period = getCurrentPeriod()

    expect(await serviceAgreement.hasPaidCurrentPeriod(user.address)).to.be.false

    await payPeriod(serviceAgreement.connect(user), user.address, period)

    expect(await serviceAgreement.hasPaidCurrentPeriod(user.address)).to.be.true
  })

  it('multiple users', async () => {
    const {
      serviceAgreement,
      user,
      anotherUser
    } = await setup()

    const period = 1
    const period2 = 2

    await payPeriod(serviceAgreement.connect(user), user.address, period)
    await payPeriod(serviceAgreement.connect(user), user.address, period2)
    await payPeriod(serviceAgreement.connect(anotherUser), anotherUser.address, period)
    await payPeriod(serviceAgreement.connect(anotherUser), anotherUser.address, period2)

    expect(await serviceAgreement.provider.getBalance(serviceAgreement.address)).to.eq(cost.mul('4'))
  })

  it('allows to pay for another user', async () => {

    const {
      serviceAgreement,
      user,
      anotherUser
    } = await setup()

    const period = 1

    await payPeriod(serviceAgreement.connect(anotherUser), user.address, period)

    expect(await serviceAgreement.hasPaidPeriod(user.address, period)).to.be.true
  })

  describe('invalid usage', () => {
    it('doesnt allow to pay less', async () => {
      const {
        serviceAgreement,
        mallory
      } = await setup()

      const period = 1

      await expect(serviceAgreement.connect(mallory).payPeriod(mallory.address, period, { value: cost.sub(1) })).rejectedWith('Pay exactly 0.00001 ETH')
    })

    it('protects for paying more', async () => {
      const {
        serviceAgreement,
        user
      } = await setup()

      const period = 1

      await expect(serviceAgreement.connect(user).payPeriod(user.address, period, { value: cost.add(1) })).rejectedWith('Pay exactly 0.00001 ETH')
    })

    it('does not allow to pay twice', async () => {
      const {
        serviceAgreement,
        user
      } = await setup()

      const period = 1

      await payPeriod(serviceAgreement.connect(user), user.address, period)

      await expect(payPeriod(serviceAgreement.connect(user), user.address, period)).rejectedWith('Period already paid')
    })

    it('allows only deployer to collect payments', async () => {
      const {
        serviceAgreement,
        mallory
      } = await setup()

      await expect(serviceAgreement.connect(mallory).collectPayments()).rejectedWith('Only payment collector')
    })
  })
})
