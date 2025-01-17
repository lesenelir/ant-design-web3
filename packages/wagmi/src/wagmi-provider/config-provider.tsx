import React from 'react';
import { type Account, type Wallet, type Chain, Web3ConfigProvider } from '@ant-design/web3-common';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useNetwork,
  useSwitchNetwork,
  type Chain as WagmiChain,
} from 'wagmi';
import { addNameToAccount, getNFTMetadata } from './methods';
import type { WalletFactory } from '../interface';

export interface AntDesignWeb3ConfigProviderProps {
  assets?: (WalletFactory | Chain)[];
  children?: React.ReactNode;
  ens?: boolean;
  availableChains: WagmiChain[];
}

export const AntDesignWeb3ConfigProvider: React.FC<AntDesignWeb3ConfigProviderProps> = (props) => {
  const { children, assets, availableChains, ens } = props;
  const { address, isDisconnected } = useAccount();
  const [account, setAccount] = React.useState<Account | undefined>();
  const { connectors, connectAsync } = useConnect();
  const { switchNetwork } = useSwitchNetwork();
  const { chain } = useNetwork();
  const { disconnectAsync } = useDisconnect();
  const [currentChain, setCurrentChain] = React.useState<Chain | undefined>(undefined);

  React.useEffect(() => {
    if (!address || isDisconnected) {
      setAccount(undefined);
      return;
    }
    const updateAccounts = async () => {
      const a = {
        address,
      };
      setAccount(ens ? await addNameToAccount(a) : a);
    };
    updateAccounts();
  }, [address, isDisconnected, chain, ens]);

  const wallets: Wallet[] = React.useMemo(() => {
    return connectors.map((connector) => {
      const walletFactory = assets?.find(
        (item) => (item as WalletFactory).name === connector.name,
      ) as WalletFactory;
      if (!walletFactory?.create) {
        throw new Error(`Can not find wallet factory for ${connector.name}`);
      }
      return walletFactory.create(connector);
    });
  }, [connectors, assets]);

  const chainList: Chain[] = React.useMemo(() => {
    return availableChains.map((item) => {
      const c = assets?.find((asset) => {
        return (asset as Chain).id === item.id;
      }) as Chain;
      if (!c?.id) {
        return {
          id: c.id,
          name: c.name,
        };
      }
      return c;
    });
  }, [availableChains, assets]);

  React.useEffect(() => {
    if (!chain && currentChain) {
      // not connected any chain, keep current chain
      return;
    }
    const currentWagmiChain = chain ?? availableChains[0];
    if (!currentWagmiChain) {
      return;
    }
    let c = assets?.find((item) => (item as Chain).id === currentWagmiChain?.id) as Chain;
    if (!c?.id) {
      c = {
        id: currentWagmiChain.id,
        name: currentWagmiChain.name,
      };
    }
    setCurrentChain(c);
    return;
  }, [chain, assets, availableChains, currentChain]);

  return (
    <Web3ConfigProvider
      availableChains={chainList}
      chain={currentChain}
      account={account}
      availableWallets={wallets}
      connect={async (wallet) => {
        const connector = connectors.find((item) => item.name === wallet?.name);
        await connectAsync({
          connector,
          chainId: currentChain?.id,
        });
      }}
      disconnect={async () => {
        await disconnectAsync();
      }}
      switchChain={async (c: Chain) => {
        switchNetwork?.(c.id);
      }}
      getNFTMetadata={async ({ address: contractAddress, tokenId }) =>
        getNFTMetadata(contractAddress, tokenId, chain?.id)
      }
    >
      {children}
    </Web3ConfigProvider>
  );
};
