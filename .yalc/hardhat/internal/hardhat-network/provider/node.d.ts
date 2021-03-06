/// <reference types="node" />
import { Block } from "@ethereumjs/block";
import Common from "@ethereumjs/common";
import { TypedTransaction } from "@ethereumjs/tx";
import { Address, BN, ECDSASignature } from "ethereumjs-util";
import EventEmitter from "events";
import { CompilerInput, CompilerOutput } from "../../../types";
import { MessageTrace } from "../stack-traces/message-trace";
import "./ethereumjs-workarounds";
import { CallParams, EstimateGasResult, FilterParams, MineBlockResult, NodeConfig, RunCallResult, SendTransactionResult, TransactionParams } from "./node-types";
import { RpcLogOutput, RpcReceiptOutput } from "./output";
export declare const COINBASE_ADDRESS: Address;
export declare class HardhatNode extends EventEmitter {
    private readonly _vm;
    private readonly _stateManager;
    private readonly _blockchain;
    private readonly _txPool;
    private _automine;
    private _blockTimeOffsetSeconds;
    static create(config: NodeConfig): Promise<[Common, HardhatNode]>;
    private static _validateHardforks;
    private readonly _localAccounts;
    private readonly _impersonatedAccounts;
    private _nextBlockTimestamp;
    private _lastFilterId;
    private _filters;
    private _nextSnapshotId;
    private readonly _snapshots;
    private readonly _vmTracer;
    private readonly _vmTraceDecoder;
    private readonly _solidityTracer;
    private readonly _consoleLogger;
    private _failedStackTraces;
    private constructor();
    getSignedTransaction(txParams: TransactionParams): Promise<TypedTransaction>;
    sendTransaction(tx: TypedTransaction): Promise<SendTransactionResult>;
    mineBlock(timestamp?: BN): Promise<MineBlockResult>;
    runCall(call: CallParams, blockNumberOrPending: BN | "pending"): Promise<RunCallResult>;
    getAccountBalance(address: Address, blockNumberOrPending?: BN | "pending"): Promise<BN>;
    getAccountNonce(address: Address, blockNumberOrPending: BN | "pending"): Promise<BN>;
    getAccountExecutableNonce(address: Address): Promise<BN>;
    getCodeFromTrace(trace: MessageTrace | undefined, blockNumberOrPending: BN | "pending"): Promise<Buffer>;
    getLatestBlock(): Promise<Block>;
    getLatestBlockNumber(): Promise<BN>;
    getPendingBlockAndTotalDifficulty(): Promise<[Block, BN]>;
    getLocalAccountAddresses(): Promise<string[]>;
    getBlockGasLimit(): BN;
    estimateGas(callParams: CallParams, blockNumberOrPending: BN | "pending"): Promise<EstimateGasResult>;
    getGasPrice(): Promise<BN>;
    getCoinbaseAddress(): Address;
    getStorageAt(address: Address, slot: BN, blockNumberOrPending: BN | "pending"): Promise<Buffer>;
    getBlockByNumber(pending: "pending"): Promise<Block>;
    getBlockByNumber(blockNumberOrPending: BN | "pending"): Promise<Block | undefined>;
    getBlockByHash(blockHash: Buffer): Promise<Block | undefined>;
    getBlockByTransactionHash(hash: Buffer): Promise<Block | undefined>;
    getBlockTotalDifficulty(block: Block): Promise<BN>;
    getCode(address: Address, blockNumberOrPending: BN | "pending"): Promise<Buffer>;
    getNextBlockTimestamp(): BN;
    setNextBlockTimestamp(timestamp: BN): void;
    getTimeIncrement(): BN;
    setTimeIncrement(timeIncrement: BN): void;
    increaseTime(increment: BN): void;
    getPendingTransaction(hash: Buffer): Promise<TypedTransaction | undefined>;
    getTransactionReceipt(hash: Buffer | string): Promise<RpcReceiptOutput | undefined>;
    getPendingTransactions(): Promise<TypedTransaction[]>;
    signPersonalMessage(address: Address, data: Buffer): Promise<ECDSASignature>;
    signTypedDataV4(address: Address, typedData: any): Promise<string>;
    getStackTraceFailuresCount(): number;
    takeSnapshot(): Promise<number>;
    revertToSnapshot(id: number): Promise<boolean>;
    newFilter(filterParams: FilterParams, isSubscription: boolean): Promise<BN>;
    newBlockFilter(isSubscription: boolean): Promise<BN>;
    newPendingTransactionFilter(isSubscription: boolean): Promise<BN>;
    uninstallFilter(filterId: BN, subscription: boolean): Promise<boolean>;
    getFilterChanges(filterId: BN): Promise<string[] | RpcLogOutput[] | undefined>;
    getFilterLogs(filterId: BN): Promise<RpcLogOutput[] | undefined>;
    getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]>;
    addCompilationResult(solcVersion: string, compilerInput: CompilerInput, compilerOutput: CompilerOutput): Promise<boolean>;
    addImpersonatedAccount(address: Buffer): true;
    removeImpersonatedAccount(address: Buffer): boolean;
    setAutomine(automine: boolean): void;
    setBlockGasLimit(gasLimit: BN | number): Promise<void>;
    private _addPendingTransaction;
    private _mineTransaction;
    private _mineTransactionAndPending;
    private _mineBlocksUntilTransactionIsIncluded;
    private _gatherTraces;
    private _validateExactNonce;
    /**
     * Mines a new block with as many pending txs as possible, adding it to
     * the VM's blockchain.
     *
     * This method reverts any modification to the state manager if it throws.
     */
    private _mineBlockWithPendingTxs;
    private _getMinimalTransactionFee;
    private _getFakeTransaction;
    private _getSnapshotIndex;
    private _removeSnapshot;
    private _initLocalAccounts;
    private _getConsoleLogMessages;
    private _manageErrors;
    private _isContractTooLargeStackTrace;
    private _calculateTimestampAndOffset;
    private _resetNextBlockTimestamp;
    private _notifyPendingTransaction;
    private _getLocalAccountPrivateKey;
    /**
     * Saves a block as successfully run. This method requires that the block
     * was added to the blockchain.
     */
    private _saveBlockAsSuccessfullyRun;
    private _timestampClashesWithPreviousBlockOne;
    private _runInBlockContext;
    private _runInPendingBlockContext;
    private _setBlockContext;
    private _restoreBlockContext;
    private _correctInitialEstimation;
    private _binarySearchEstimation;
    /**
     * This function runs a transaction and reverts all the modifications that it
     * makes.
     */
    private _runTxAndRevertMutations;
    private _computeFilterParams;
    private _newDeadline;
    private _getNextFilterId;
    private _filterIdToFiltersKey;
    private _emitEthEvent;
    private _getNonce;
}
//# sourceMappingURL=node.d.ts.map