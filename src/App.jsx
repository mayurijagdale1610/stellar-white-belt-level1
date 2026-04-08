import { useState } from "react";
import { getAddress, signTransaction, requestAccess, isConnected } from "@stellar/freighter-api";
import {
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Transaction,
} from "@stellar/stellar-sdk";

function App() {
  const [publicKey, setPublicKey] = useState("");
  const [balance, setBalance] = useState("");
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const NETWORK = "Test SDF Network ; September 2015";
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");

  // 🔹 CONNECT WALLET
  const connectWallet = async () => {
    try {
      setLoading(true);
      setTxStatus("Connecting to Freighter...");

      // 1. Check if extension is installed
      if (!isConnected()) {
        setTxStatus("Freighter not found ❌ Please install the extension.");
        return;
      }

      // 2. Request Access (This triggers the popup)
      const { address } = await requestAccess();
      
      if (!address) {
        throw new Error("User denied access or no address returned");
      }

      setPublicKey(address);

      try {
        const account = await server.loadAccount(address);
        const xlmBalance = account.balances.find(
          (bal) => bal.asset_type === "native"
        );
        setBalance(xlmBalance.balance);
        setTxStatus("");
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setBalance("0");
          setTxStatus("Account not found on Testnet ⚠️ Please fund it using Friendbot.");
        } else {
          throw err;
        }
      }
    } catch (error) {
      console.error("Connect Error:", error);
      setTxStatus("Wallet connection failed ❌ Make sure Freighter is installed and unlocked.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 DISCONNECT WALLET
  const disconnectWallet = () => {
    setPublicKey("");
    setBalance("");
    setReceiver("");
    setAmount("");
    setTxStatus("Wallet Disconnected 👋");
    setTimeout(() => setTxStatus(""), 3000);
  };

  // 🔹 SEND XLM
  const sendXLM = async () => {
    try {
      if (!receiver) {
        setTxStatus("Enter receiver public key ⚠️");
        return;
      }

      if (!amount || Number(amount) <= 0) {
        setTxStatus("Enter valid amount ⚠️");
        return;
      }

      if (Number(amount) > Number(balance)) {
        setTxStatus("Insufficient balance ⚠️");
        return;
      }

      setTxStatus("Processing...");
      setLoading(true);

      const account = await server.loadAccount(publicKey);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK,
      })
        .addOperation(
          Operation.payment({
            destination: receiver,
            asset: Asset.native(),
            amount: amount,
          })
        )
        .setTimeout(100)
        .build();

      const { signedTxXdr } = await signTransaction(
        transaction.toXDR(),
        { networkPassphrase: NETWORK }
      );

      const signedTx = new Transaction(signedTxXdr, NETWORK);

      const result = await server.submitTransaction(signedTx);

      setTxStatus(`Transaction Successful ✅ Hash: ${result.hash.substring(0, 8)}...`);

      // 🔄 Refresh balance
      const updatedAccount = await server.loadAccount(publicKey);
      const updatedBalance = updatedAccount.balances.find(
        (b) => b.asset_type === "native"
      );

      setBalance(updatedBalance.balance);
      setAmount("");
      setReceiver("");

    } catch (error) {
      console.error("Transaction Error:", error);
      setTxStatus("Transaction Failed ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <span className="header-icon">🚀</span>
      <h1>Stellar Wallet</h1>
      <p className="subtitle">Secure and lightning-fast Stellar transactions</p>

      {!publicKey ? (
        <button onClick={connectWallet} disabled={loading}>
          {loading ? "Connecting..." : "Connect Freighter Wallet"}
        </button>
      ) : (
        <>
          <div className="stats-card">
            <div className="stat-item">
              <span className="stat-label">Your Account</span>
              <span className="stat-value">{publicKey}</span>
            </div>
            <div className="stat-item" style={{ marginTop: '16px' }}>
              <span className="stat-label">Available Balance</span>
              <span className="balance-value">{Number(balance).toLocaleString()} XLM</span>
            </div>
          </div>

          <div className="divider"></div>

          <div className="input-group">
            <div className="stat-label">Transfer Assets</div>
            <input
              type="text"
              placeholder="Receiver Address (G...)"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
            />

            <input
              type="number"
              placeholder="Amount to send"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <button onClick={sendXLM} disabled={loading || !receiver || !amount}>
              {loading ? "Processing..." : "Confirm Transfer"}
            </button>
            <button 
              onClick={disconnectWallet} 
              style={{ 
                marginTop: '12px', 
                background: 'rgba(255, 255, 255, 0.1)', 
                color: '#94a3b8',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              Disconnect Wallet
            </button>
          </div>
        </>
      )}

      {txStatus && (
        <div className={`status-msg ${
          txStatus.includes("✅") ? "success" : 
          txStatus.includes("❌") || txStatus.includes("⚠️") ? "error" : "processing"
        }`}>
          {txStatus}
        </div>
      )}
    </div>
  );
}

export default App;