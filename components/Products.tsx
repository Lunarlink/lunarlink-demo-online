import { useRef, useState, useEffect, useMemo } from "react";
import { products } from "../lib/products"
import NumberInput from "./NumberInput";
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError, getMint } from "@solana/spl-token"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { PublicKey, Keypair, Transaction } from "@solana/web3.js"
import Loading from "./Loading";
import { findReference, FindReferenceError } from "@solana/pay";
import { useRouter } from "next/router";

interface Props {
  submitTarget: string;
  enabled: boolean;
}

export default function Products({ submitTarget, enabled }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const backendApi = process.env.BACKEND_API as string

  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [tokenBalance, setTokenBalance] = useState(0)
  const [tokenName, setTokenName] = useState("")
  const [partnerId, setPartnerId] = useState("")
  const [usePoints, setUsePoints] = useState(false)
  const [loading, setLoading] = useState(false)

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reference, setReference] = useState<PublicKey | null>(null)

  const handleChange = () => {
    setUsePoints(!usePoints);
  };

  async function getTokenBalance() {
    if (!publicKey) {
      setTokenBalance(0)
      return
    }

    try {
      const partnerId = process.env.PARTNER_ID as string

      const partnerResponse = await fetch(`${backendApi}/partner/${partnerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const partner = await partnerResponse.json()
      setPartnerId(partner.id)

      const program = partner.associatedProgram
      setTokenName(program.tokenName)

      const userTokenAddress = await getAssociatedTokenAddress(new PublicKey(program.tokenAddress), publicKey)
      const userTokenAccount = await getAccount(connection, userTokenAddress)

      const tokenMint = await getMint(connection, new PublicKey(program.tokenAddress))
      const userTokenAmount = Number(userTokenAccount.amount)

      setTokenBalance(userTokenAmount / 10**tokenMint.decimals)
    } catch (e) {
      if (e instanceof TokenAccountNotFoundError) {
        // This is ok, the API will create one when they make a payment
        console.log(`User ${publicKey} doesn't have a coupon account yet!`)
        setTokenBalance(0)
      } else {
        console.error('Error getting coupon balance', e)
      }
    }
  }

  useEffect(() => {
    getTokenBalance()
  }, [publicKey])

  // Send the fetched transaction to the connected wallet
  async function trySendTransaction() {
    if (!transaction) {
      return;
    }
    try {
      await sendTransaction(transaction, connection)
    } catch (e) {
      console.error(e)
    }
  }

  // Send the transaction once it's fetched
  useEffect(() => {
    trySendTransaction()
  }, [transaction])

  const handleSubmit = async (event) => {
    // Stop the form from submitting and refreshing the page.
    event.preventDefault()
  }

  const handleBuy = async (e, price) => {
    e.preventDefault();
    try {
      if (!publicKey) {
        return;
      }
      setLoading(true)

      const newReference = Keypair.generate().publicKey
      
      const body = {
        account: publicKey.toString(),
      }

      // const searchParams = makeSearchParams(router.query)
      const searchParams = new URLSearchParams()
      // Add reference to the params we'll pass to the API
      searchParams.append('reference', newReference.toString());
      searchParams.append('amount', price);
      searchParams.append('pid', partnerId);
      searchParams.append('usePoints', usePoints.toString());

      const response = await fetch(`${backendApi}/transaction?${searchParams.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
      })
      const json = await response.json()

      if (response.status !== 200) {
        console.error("ERROR", json);
        setLoading(false)
        setMessage(json.error);  
        setReference(null)
        return;
      }

      // Deserialize the transaction from the response
      const transaction = Transaction.from(Buffer.from(json.transaction, 'base64'));
      setTransaction(transaction);
      // setMessage(json.message);
      setReference(newReference)
    } catch (e) {
      setLoading(false)
      setReference(null)
      setMessage("Error creating transaction");
    }

  }

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Check if there is any transaction for the reference
        if (!reference) {
          return;
        }

        const signatureInfo = await findReference(connection, reference);
        // router.push('/confirmed')
        clearInterval(interval)
        setMessage('Transaction confirmed! Thank you for your purchase! 🚀')
        setReference(null)
        setLoading(false)
        getTokenBalance()
      } catch (e) {
        if (e instanceof FindReferenceError) {
          // No transaction found yet, ignore this error
          return;
        }
        console.error('Unknown error', e)
      }
    }, 500)
    return () => {
      clearInterval(interval)
    }
  }, [reference])

  return (
    // <form method='get' action={submitTarget} ref={formRef}>
    <form method='get' onSubmit={handleSubmit}>
      {(enabled) ?
      <div className="flex self-center" hidden={!enabled}>
          <input checked={usePoints} onChange={handleChange} type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
        <label className="ml-2 max-w-fit "> Use {tokenName} (Balance: {tokenBalance})</label>
      </div>   
        : ""}
      {(loading) ? <p>Creating transaction...<Loading /> </p>: ""}
      {message ?
        <p>{message}</p> :
        ""
      }
      <div className='flex flex-col gap-4'>
        <div className="grid grid-cols-2 gap-8">
          {products.map(product => {
            return (
              <div className="rounded-md bg-sky-50 text-left p-8" key={product.id}>
                <img src={product.image} alt={product.name} className="w-64 h-64" />
                <h3 className="text-2xl font-bold">{product.name}</h3>
                {/* <p className="text-sm text-gray-800">{product.description}</p> */}
                <p className="my-2">
                  <span className="mt-4 text-xl font-bold" id="price">${product.priceUsd}</span>
                </p>
                <div className="mt-1">
                  {/* <NumberInput name={product.id} formRef={formRef} /> */}
                </div>

                <button
                  className="items-center px-20 rounded-md py-2 max-w-fit self-center bg-gray-900 text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!enabled && tokenName !== ""}
                  onClick={e => {
                    handleBuy(e, product.priceUsd);
                  }}
                >
                  Buy Now
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </form>
  )
}
