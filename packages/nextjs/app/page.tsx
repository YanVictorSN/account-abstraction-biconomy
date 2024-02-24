"use client";

import { useEffect, useState } from "react";
import { createSmartAccountClient } from "@biconomy/account";
import { CHAIN_NAMESPACES, IProvider } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { Web3Auth } from "@web3auth/modal";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { ethers } from "ethers";
import Web3 from "web3";
import { Address } from "~~/components/scaffold-eth";

const chainId = 80001;
const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x13881",
  rpcTarget: "https://rpc.ankr.com/polygon_mumbai",
  displayName: "Polygon Mumbai Testnet",
  blockExplorer: "https://mumbai.polygonscan.com/",
  ticker: "MATIC",
  tickerName: "Matic",
};

const clientId: string = process.env.AUTHWEB3_CLIENT_ID || " ";

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

const web3auth = new Web3Auth({
  clientId,
  chainConfig,
  uiConfig: {
    appName: "Biconomy X Web3Auth",
    mode: "dark",
    loginMethodsOrder: ["google"],
    logoLight: "https://web3auth.io/images/web3auth-logo.svg",
    logoDark: "https://web3auth.io/images/web3auth-logo---Dark.svg",
    defaultLanguage: "en",
    loginGridCol: 3,
    primaryButton: "socialLogin",
  },
  web3AuthNetwork: "sapphire_devnet",
  privateKeyProvider,
});

const openloginAdapter = new OpenloginAdapter({
  privateKeyProvider,
});
web3auth.configureAdapter(openloginAdapter);

function App() {
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await web3auth.initModal();
        setProvider(web3auth.provider);
        if (web3auth.connected) {
          setLoggedIn(true);
        }
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  const login = async () => {
    const web3authProvider = await web3auth.connect();
    setProvider(web3authProvider);

    if (web3authProvider) {
      const ethersProvider = new ethers.providers.Web3Provider(web3authProvider as any);
      const web3AuthSigner = ethersProvider.getSigner();

      const config = {
        biconomyPaymasterApiKey: process.env.BICONOMY_PAYMASTER,
        bundlerUrl: `https://bundler.biconomy.io/api/v2/${chainId}/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44`,
      };

      const smartWallet = await createSmartAccountClient({
        signer: web3AuthSigner,
        biconomyPaymasterApiKey: config.biconomyPaymasterApiKey,
        bundlerUrl: config.bundlerUrl,
        rpcUrl: "", // <-- read about this at https://docs.biconomy.io/Account/methods#createsmartaccountclient
      });
      console.log(smartWallet);

      const address = await smartWallet.getAccountAddress();
      console.log(address);
    } else {
      console.error("web3authProvider is null");
    }
    if (web3auth.connected) {
      setLoggedIn(true);
      getAllData();
    }
  };

  const logout = async () => {
    await web3auth.logout();
    setProvider(null);
    setLoggedIn(false);
  };

  interface UserData {
    name: string | undefined;
    email: string | undefined;
  }

  const [userData, setUserData] = useState<UserData>({ name: "", email: "" });
  const [address, setAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("");

  async function getAllData() {
    if (!provider) {
      console.log("Provider not initalized yet");
      return;
    }
    const web3 = new Web3(provider as any);
    const user = await web3auth.getUserInfo();
    const userData: UserData = {
      name: user.name,
      email: user.email,
    };
    setUserData(userData);
    const addresses = await web3.eth.getAccounts();
    const address = addresses[0];
    setAddress(address);
    const balance = web3.utils.fromWei(await web3.eth.getBalance(address), "ether");
    setBalance(balance);
  }

  const loggedInView = (
    <>
      <div className="flex items-center px-2">
        <button onClick={logout} className="btn btn-info">
          Logout
        </button>
      </div>
    </>
  );

  const unloggedInView = (
    <button onClick={login} className="btn btn-info">
      Login
    </button>
  );

  return (
    <div className="flex flex-col align-center items-center content-center justify-items-center py-10">
      <div>
        {address && (
          <>
            <div>
              Name: <h2>{userData.name}</h2>
              E-mail: <h2>{userData.email}</h2>
              Address: <Address address={address} />
              Balance: <h2>{balance}</h2>
            </div>
          </>
        )}
      </div>
      <div className="grid">{loggedIn ? loggedInView : unloggedInView}</div>
    </div>
  );
}

export default App;
