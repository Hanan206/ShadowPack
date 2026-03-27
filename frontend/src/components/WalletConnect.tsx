"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useDisconnectWallet,
  useSuiClientQuery,
} from "@onelabs/dapp-kit";
import { MIST_PER_OCT, FAUCET_URL } from "@/lib/constants";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatOct(balance: bigint): string {
  const whole = balance / BigInt(MIST_PER_OCT);
  const frac = balance % BigInt(MIST_PER_OCT);
  const fracStr = frac.toString().padStart(9, "0").slice(0, 2);
  return `${whole}.${fracStr}`;
}

export default function WalletConnect() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: balanceData } = useSuiClientQuery(
    "getBalance",
    { owner: account?.address ?? "" },
    { enabled: !!account }
  );

  const balance = balanceData ? BigInt(balanceData.totalBalance) : BigInt(0);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node)
    ) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  if (!account) {
    return (
      <ConnectButton className="!bg-transparent !border !border-[#E2B714]/40 hover:!border-[#E2B714] hover:!bg-[#E2B714]/5 !text-[#E2B714] !font-semibold !px-5 !py-2.5 !rounded-lg !transition-all !duration-200" />
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-3 bg-[#161525] hover:bg-[#201F32] border border-[#E2B714]/20 hover:border-[#E2B714]/40 rounded-lg px-4 py-2.5 transition-all duration-200"
      >
        <div className="w-2 h-2 rounded-full bg-[#3B9B6D]" />
        <span className="text-sm font-mono text-[#D4D0E0]">
          {truncateAddress(account.address)}
        </span>
        <div className="h-4 w-px bg-white/[0.08]" />
        <span className="text-sm font-semibold text-[#E2B714]">
          {formatOct(balance)} OCT
        </span>
        <svg
          className={`w-3.5 h-3.5 text-[#7A7490] transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-[#201F32] border border-[#E2B714]/20 rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-md">
          <div className="p-3.5 border-b border-white/[0.06]">
            <p className="text-[11px] text-[#7A7490] font-medium uppercase tracking-wider">
              Connected Address
            </p>
            <p className="text-xs font-mono text-[#D4D0E0] mt-1 break-all leading-relaxed">
              {account.address}
            </p>
          </div>
          <div className="p-3.5 border-b border-white/[0.06]">
            <p className="text-[11px] text-[#7A7490] font-medium uppercase tracking-wider">Balance</p>
            <p className="text-sm font-semibold text-[#E2B714] mt-1">
              {formatOct(balance)} OCT
            </p>
          </div>
          <div className="p-1">
            <a
              href={FAUCET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 text-sm text-[#D4D0E0] hover:bg-white/[0.04] rounded-lg transition-colors duration-200"
            >
              <svg
                className="w-4 h-4 text-[#E2B714]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Get Testnet OCT
            </a>
            <button
              onClick={() => {
                disconnect();
                setDropdownOpen(false);
              }}
              className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 text-sm text-[#FF4655] hover:bg-[#FF4655]/8 rounded-lg transition-colors duration-200"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
