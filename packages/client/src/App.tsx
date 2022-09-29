import RLogin, { RLoginButton } from '@rsksmart/rlogin'
import { useState } from 'react'
import { providers, Contract, BigNumber, ContractTransaction, ContractReceipt, utils } from 'ethers'
import { ServiceAgreement } from '@paid-cloud/contracts/typechain-types/ServiceAgreement'
import ServiceAgreementData from '@paid-cloud/contracts/artifacts/contracts/ServiceAgreement.sol/ServiceAgreement.json'
import { cost, getCurrentPeriod } from '@paid-cloud/contracts/lib'

const backendUrl = 'http://localhost:3001'
const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'

const rpcUrls = {
  31337: 'http://127.0.0.1:8545/',
}

const supportedChains = Object.keys(rpcUrls).map(Number)

const infoOptions = {
  31: { addressBaseURL: 'https://explorer.testnet.rsk.co/address/' }
}

export const rLogin = new RLogin({
  backendUrl,
  rpcUrls,
  supportedChains,
  infoOptions
})

function App() {
  const [serviceAgreement, setServiceAgreement] = useState<ServiceAgreement>()
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState<BigNumber>()

  const [authKeys, setAuthKeys] = useState<{ accessToken: string, refreshToken: string }>()

  const [hasPaidThisMonth, setHasPaidThisMonth] = useState(false)
  const [hasPaidNextMonth, setHasPaidNextMonth] = useState(false)

  const [tx, setTx] = useState<ContractTransaction>()
  const [receipt, setReceipt] = useState<ContractReceipt>()

  const [key, setKey] = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [value, setValue] = useState('')

  const [error, setError] = useState<Error>()

  const hasPaidPeriod = async (serviceAgreement: ServiceAgreement, period: BigNumber) => serviceAgreement.hasPaidPeriod(
    await serviceAgreement.signer.getAddress(),
    period
  )

  const getLastPeriods = async (serviceAgreement: ServiceAgreement) => {
    const currentPeriod = getCurrentPeriod()
    setHasPaidThisMonth(await hasPaidPeriod(serviceAgreement, currentPeriod))
    setHasPaidNextMonth(await hasPaidPeriod(serviceAgreement, currentPeriod.add(1)))
  }

  const login = async () => {
    const { provider, authKeys } = await rLogin.connect()
    setAuthKeys(authKeys)
    const signer = new providers.Web3Provider(provider).getSigner()
    const serviceAgreement = new Contract(
      contractAddress,
      ServiceAgreementData.abi,
      signer
    ) as ServiceAgreement

    setServiceAgreement(serviceAgreement)

    setAddress(await signer.getAddress())
    setBalance(await signer.getBalance())

    await getLastPeriods(serviceAgreement)
  }

  const payMonth = async (period: BigNumber) => {
    try {
      const tx = await serviceAgreement!.payPeriod(address, period, { value: cost })
      setTx(tx)

      const receipt = await tx.wait()
      setReceipt(receipt)

      await getLastPeriods(serviceAgreement!)
    } catch (e: any) {
      setError(e)
    }
  }

  const payThisMonth = () => payMonth(getCurrentPeriod())
  const payNextMonth = () => payMonth(getCurrentPeriod().add(1))

  const getContent = () => fetch(`http://localhost:3001/${key}`, {
      method: 'GET',
      headers: {
        'Authorization': `DIDAuth ${authKeys!.accessToken}`
      }
    }).then(res => {
      if (!res.ok) throw new Error(`error: ${res.status.toString()}`)
      return res.text()
    })
      .then(setCurrentValue)
      .catch(setError)

  const setContent = () => fetch(`http://localhost:3001/${key}`, {
      method: 'POST',
      body: value,
      headers: {
        'Authorization': `DIDAuth ${authKeys!.accessToken}`
      }
    }).then(res => {
      if (!res.ok) throw new Error(`error: ${res.status.toString()}`)
      return getContent()
    })
      .catch(setError)

  return <div style={{ padding: 50, textAlign: 'center' }}>
    <RLoginButton onClick={login} disabled={!!serviceAgreement}>login</RLoginButton>
    {address && balance && <p>{address} - {utils.formatEther(balance)} RBTC</p>}
    <h1>Paid cloud</h1>
    {error && <label>{error.message}</label>}
    <div style={{ display: 'table', width: '100%' }}>
      <div style={{ display: 'table-row' }}>
        <div style={{ display: 'table-cell', minWidth: 300 }}>
          <h2>Your payment</h2>
          <small>Based on {contractAddress}</small>
          <p>Current month: {hasPaidThisMonth ? 'yes' : <button disabled={!serviceAgreement} onClick={payThisMonth}>Pay this month</button>}</p>
          <p>Next month: {hasPaidNextMonth ? 'yes' : <button disabled={!serviceAgreement} onClick={payNextMonth}>Pay next month</button>}</p>
          {!!tx && <p>Tx: {tx.hash}</p>}
          {!!receipt && <p>Status: {receipt.status}</p>}
        </div>
        <div style={{ display: 'table-cell', minWidth: 300 }}>
          <h2>Your cloud</h2>
          <small>Using {backendUrl}</small>
          <div>
            <input placeholder='key' value={key} onChange={e => setKey(e.target.value)} />
            <button onClick={getContent}>get</button>
          </div>
          <p>Current value: {currentValue}</p>
          <div>
            <input placeholder='value' value={value} onChange={e => setValue(e.target.value)} />
            <button onClick={setContent}>save</button>
          </div>
        </div>
      </div>
    </div>
  </div>
}

export default App;
