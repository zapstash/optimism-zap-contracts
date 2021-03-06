"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardhatNode = exports.COINBASE_ADDRESS = void 0;
const common_1 = __importDefault(require("@ethereumjs/common"));
const tx_1 = require("@ethereumjs/tx");
const vm_1 = __importDefault(require("@ethereumjs/vm"));
const bloom_1 = __importDefault(require("@ethereumjs/vm/dist/bloom"));
const exceptions_1 = require("@ethereumjs/vm/dist/exceptions");
const chalk_1 = __importDefault(require("chalk"));
const debug_1 = __importDefault(require("debug"));
const ethereumjs_util_1 = require("ethereumjs-util");
const events_1 = __importDefault(require("events"));
const default_config_1 = require("../../core/config/default-config");
const errors_1 = require("../../core/errors");
const errors_2 = require("../../core/providers/errors");
const reporter_1 = require("../../sentry/reporter");
const date_1 = require("../../util/date");
const compiler_to_model_1 = require("../stack-traces/compiler-to-model");
const consoleLogger_1 = require("../stack-traces/consoleLogger");
const contracts_identifier_1 = require("../stack-traces/contracts-identifier");
const message_trace_1 = require("../stack-traces/message-trace");
const revert_reasons_1 = require("../stack-traces/revert-reasons");
const solidity_errors_1 = require("../stack-traces/solidity-errors");
const solidity_stack_trace_1 = require("../stack-traces/solidity-stack-trace");
const solidityTracer_1 = require("../stack-traces/solidityTracer");
const vm_trace_decoder_1 = require("../stack-traces/vm-trace-decoder");
const vm_tracer_1 = require("../stack-traces/vm-tracer");
require("./ethereumjs-workarounds");
const filter_1 = require("./filter");
const ForkBlockchain_1 = require("./fork/ForkBlockchain");
const ForkStateManager_1 = require("./fork/ForkStateManager");
const HardhatBlockchain_1 = require("./HardhatBlockchain");
const HardhatStateManager_1 = require("./HardhatStateManager");
const output_1 = require("./output");
const FakeSenderAccessListEIP2930Transaction_1 = require("./transactions/FakeSenderAccessListEIP2930Transaction");
const FakeSenderTransaction_1 = require("./transactions/FakeSenderTransaction");
const TxPool_1 = require("./TxPool");
const TxPriorityHeap_1 = require("./TxPriorityHeap");
const getCurrentTimestamp_1 = require("./utils/getCurrentTimestamp");
const makeCommon_1 = require("./utils/makeCommon");
const makeForkClient_1 = require("./utils/makeForkClient");
const makeForkCommon_1 = require("./utils/makeForkCommon");
const putGenesisBlock_1 = require("./utils/putGenesisBlock");
const txMapToArray_1 = require("./utils/txMapToArray");
const log = debug_1.default("hardhat:core:hardhat-network:node");
// This library's types are wrong, they don't type check
// tslint:disable-next-line no-var-requires
const ethSigUtil = require("eth-sig-util");
exports.COINBASE_ADDRESS = ethereumjs_util_1.Address.fromString("0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e");
// tslint:disable only-hardhat-error
class HardhatNode extends events_1.default {
    constructor(_vm, _stateManager, _blockchain, _txPool, _automine, _blockTimeOffsetSeconds = new ethereumjs_util_1.BN(0), genesisAccounts, tracingConfig) {
        super();
        this._vm = _vm;
        this._stateManager = _stateManager;
        this._blockchain = _blockchain;
        this._txPool = _txPool;
        this._automine = _automine;
        this._blockTimeOffsetSeconds = _blockTimeOffsetSeconds;
        this._localAccounts = new Map(); // address => private key
        this._impersonatedAccounts = new Set(); // address
        this._nextBlockTimestamp = new ethereumjs_util_1.BN(0);
        this._lastFilterId = new ethereumjs_util_1.BN(0);
        this._filters = new Map();
        this._nextSnapshotId = 1; // We start in 1 to mimic Ganache
        this._snapshots = [];
        this._consoleLogger = new consoleLogger_1.ConsoleLogger();
        this._failedStackTraces = 0;
        this._initLocalAccounts(genesisAccounts);
        this._vmTracer = new vm_tracer_1.VMTracer(this._vm, this._stateManager.getContractCode.bind(this._stateManager), false);
        this._vmTracer.enableTracing();
        const contractsIdentifier = new contracts_identifier_1.ContractsIdentifier();
        this._vmTraceDecoder = new vm_trace_decoder_1.VmTraceDecoder(contractsIdentifier);
        this._solidityTracer = new solidityTracer_1.SolidityTracer();
        if (tracingConfig === undefined || tracingConfig.buildInfos === undefined) {
            return;
        }
        try {
            for (const buildInfo of tracingConfig.buildInfos) {
                const bytecodes = compiler_to_model_1.createModelsAndDecodeBytecodes(buildInfo.solcVersion, buildInfo.input, buildInfo.output);
                for (const bytecode of bytecodes) {
                    this._vmTraceDecoder.addBytecode(bytecode);
                }
            }
        }
        catch (error) {
            console.warn(chalk_1.default.yellow("The Hardhat Network tracing engine could not be initialized. Run Hardhat with --verbose to learn more."));
            log("Hardhat Network tracing disabled: ContractsIdentifier failed to be initialized. Please report this to help us improve Hardhat.\n", error);
            reporter_1.Reporter.reportError(error);
        }
    }
    static async create(config) {
        const { automine, genesisAccounts, blockGasLimit, allowUnlimitedContractSize, tracingConfig, } = config;
        let common;
        let stateManager;
        let blockchain;
        let initialBlockTimeOffset;
        if ("forkConfig" in config) {
            const { forkClient, forkBlockNumber, forkBlockTimestamp, } = await makeForkClient_1.makeForkClient(config.forkConfig, config.forkCachePath);
            common = await makeForkCommon_1.makeForkCommon(config);
            this._validateHardforks(config.forkConfig.blockNumber, common, forkClient.getNetworkId());
            const forkStateManager = new ForkStateManager_1.ForkStateManager(forkClient, forkBlockNumber);
            await forkStateManager.initializeGenesisAccounts(genesisAccounts);
            stateManager = forkStateManager;
            blockchain = new ForkBlockchain_1.ForkBlockchain(forkClient, forkBlockNumber, common);
            initialBlockTimeOffset = new ethereumjs_util_1.BN(date_1.getDifferenceInSeconds(new Date(forkBlockTimestamp), new Date()));
        }
        else {
            const hardhatStateManager = new HardhatStateManager_1.HardhatStateManager();
            await hardhatStateManager.initializeGenesisAccounts(genesisAccounts);
            const initialStateRoot = await hardhatStateManager.getStateRoot();
            common = makeCommon_1.makeCommon(config, initialStateRoot);
            const hardhatBlockchain = new HardhatBlockchain_1.HardhatBlockchain();
            await putGenesisBlock_1.putGenesisBlock(hardhatBlockchain, common);
            if (config.initialDate !== undefined) {
                initialBlockTimeOffset = new ethereumjs_util_1.BN(date_1.getDifferenceInSeconds(config.initialDate, new Date()));
            }
            blockchain = hardhatBlockchain;
            stateManager = hardhatStateManager;
        }
        const txPool = new TxPool_1.TxPool(stateManager, new ethereumjs_util_1.BN(blockGasLimit), common);
        const vm = new vm_1.default({
            common,
            activatePrecompiles: true,
            stateManager,
            blockchain: blockchain,
            allowUnlimitedContractSize,
        });
        const node = new HardhatNode(vm, stateManager, blockchain, txPool, automine, initialBlockTimeOffset, genesisAccounts, tracingConfig);
        return [common, node];
    }
    static _validateHardforks(forkBlockNumber, common, remoteChainId) {
        if (!common.gteHardfork("spuriousDragon")) {
            throw new errors_2.InternalError(`Invalid hardfork selected in Hardhat Network's config.

The hardfork must be at least spuriousDragon, but ${common.hardfork()} was given.`);
        }
        if (forkBlockNumber !== undefined) {
            let upstreamCommon;
            try {
                upstreamCommon = new common_1.default({ chain: remoteChainId });
            }
            catch (error) {
                // If ethereumjs doesn't have a common it will throw and we won't have
                // info about the activation block of each hardfork, so we don't run
                // this validation.
                return;
            }
            upstreamCommon.setHardforkByBlockNumber(forkBlockNumber);
            if (!upstreamCommon.gteHardfork("spuriousDragon")) {
                throw new errors_2.InternalError(`Cannot fork ${upstreamCommon.chainName()} from block ${forkBlockNumber}.

Hardhat Network's forking functionality only works with blocks from at least spuriousDragon.`);
            }
        }
    }
    async getSignedTransaction(txParams) {
        const senderAddress = ethereumjs_util_1.bufferToHex(txParams.from);
        const pk = this._localAccounts.get(senderAddress);
        if (pk !== undefined) {
            let tx;
            if (txParams.accessList !== undefined) {
                tx = tx_1.AccessListEIP2930Transaction.fromTxData(txParams, {
                    common: this._vm._common,
                });
            }
            else {
                tx = tx_1.Transaction.fromTxData(txParams, { common: this._vm._common });
            }
            return tx.sign(pk);
        }
        if (this._impersonatedAccounts.has(senderAddress)) {
            return this._getFakeTransaction(txParams);
        }
        throw new errors_2.InvalidInputError(`unknown account ${senderAddress}`);
    }
    async sendTransaction(tx) {
        if (!this._automine) {
            return this._addPendingTransaction(tx);
        }
        await this._validateExactNonce(tx);
        if (this._txPool.hasPendingTransactions() ||
            this._txPool.hasQueuedTransactions()) {
            return this._mineTransactionAndPending(tx);
        }
        return this._mineTransaction(tx);
    }
    async mineBlock(timestamp) {
        const [blockTimestamp, offsetShouldChange, newOffset,] = this._calculateTimestampAndOffset(timestamp);
        const needsTimestampIncrease = await this._timestampClashesWithPreviousBlockOne(blockTimestamp);
        if (needsTimestampIncrease) {
            blockTimestamp.iaddn(1);
        }
        let result;
        try {
            result = await this._mineBlockWithPendingTxs(blockTimestamp);
        }
        catch (err) {
            if (err === null || err === void 0 ? void 0 : err.message.includes("sender doesn't have enough funds")) {
                throw new errors_2.InvalidInputError(err.message, err);
            }
            // Some network errors are HardhatErrors, and can end up here when forking
            if (errors_1.HardhatError.isHardhatError(err)) {
                throw err;
            }
            throw new errors_2.TransactionExecutionError(err);
        }
        await this._saveBlockAsSuccessfullyRun(result.block, result.blockResult);
        if (needsTimestampIncrease) {
            this.increaseTime(new ethereumjs_util_1.BN(1));
        }
        if (offsetShouldChange) {
            this.setTimeIncrement(newOffset);
        }
        await this._resetNextBlockTimestamp();
        return result;
    }
    async runCall(call, blockNumberOrPending) {
        const tx = await this._getFakeTransaction(Object.assign(Object.assign({}, call), { nonce: await this._getNonce(new ethereumjs_util_1.Address(call.from), blockNumberOrPending) }));
        const result = await this._runInBlockContext(blockNumberOrPending, async () => this._runTxAndRevertMutations(tx, blockNumberOrPending));
        const traces = await this._gatherTraces(result.execResult);
        return Object.assign(Object.assign({}, traces), { result: result.execResult.returnValue });
    }
    async getAccountBalance(address, blockNumberOrPending) {
        if (blockNumberOrPending === undefined) {
            blockNumberOrPending = await this.getLatestBlockNumber();
        }
        const account = await this._runInBlockContext(blockNumberOrPending, () => this._stateManager.getAccount(address));
        return new ethereumjs_util_1.BN(account.balance);
    }
    async getAccountNonce(address, blockNumberOrPending) {
        const account = await this._runInBlockContext(blockNumberOrPending, () => this._stateManager.getAccount(address));
        return new ethereumjs_util_1.BN(account.nonce);
    }
    async getAccountExecutableNonce(address) {
        return this._txPool.getExecutableNonce(address);
    }
    async getCodeFromTrace(trace, blockNumberOrPending) {
        if (trace === undefined ||
            message_trace_1.isPrecompileTrace(trace) ||
            message_trace_1.isCreateTrace(trace)) {
            return Buffer.from("");
        }
        return this.getCode(new ethereumjs_util_1.Address(trace.address), blockNumberOrPending);
    }
    async getLatestBlock() {
        return this._blockchain.getLatestBlock();
    }
    async getLatestBlockNumber() {
        return new ethereumjs_util_1.BN((await this.getLatestBlock()).header.number);
    }
    async getPendingBlockAndTotalDifficulty() {
        return this._runInPendingBlockContext(async () => {
            const block = await this._blockchain.getLatestBlock();
            const totalDifficulty = await this._blockchain.getTotalDifficulty(block.hash());
            return [block, totalDifficulty];
        });
    }
    async getLocalAccountAddresses() {
        return [...this._localAccounts.keys()];
    }
    getBlockGasLimit() {
        return this._txPool.getBlockGasLimit();
    }
    async estimateGas(callParams, blockNumberOrPending) {
        // We get the CallParams and transform it into a TransactionParams to be
        // able to run it.
        const txParams = Object.assign(Object.assign({}, callParams), { nonce: await this._getNonce(new ethereumjs_util_1.Address(callParams.from), blockNumberOrPending) });
        const tx = await this._getFakeTransaction(txParams);
        // TODO: This may not work if there are multiple txs in the mempool and
        //  the one being estimated won't fit in the first block, or maybe even
        //  if the state accessed by the tx changes after it is executed within
        //  the first block.
        const result = await this._runInBlockContext(blockNumberOrPending, () => this._runTxAndRevertMutations(tx, blockNumberOrPending));
        let vmTrace = this._vmTracer.getLastTopLevelMessageTrace();
        const vmTracerError = this._vmTracer.getLastError();
        this._vmTracer.clearLastError();
        if (vmTrace !== undefined) {
            vmTrace = this._vmTraceDecoder.tryToDecodeMessageTrace(vmTrace);
        }
        const consoleLogMessages = await this._getConsoleLogMessages(vmTrace, vmTracerError);
        // This is only considered if the call to _runTxAndRevertMutations doesn't
        // manage errors
        if (result.execResult.exceptionError !== undefined) {
            return {
                estimation: this.getBlockGasLimit(),
                trace: vmTrace,
                error: await this._manageErrors(result.execResult, vmTrace, vmTracerError),
                consoleLogMessages,
            };
        }
        const initialEstimation = result.gasUsed;
        return {
            estimation: await this._correctInitialEstimation(blockNumberOrPending, txParams, initialEstimation),
            trace: vmTrace,
            consoleLogMessages,
        };
    }
    async getGasPrice() {
        return new ethereumjs_util_1.BN(default_config_1.HARDHAT_NETWORK_DEFAULT_GAS_PRICE);
    }
    getCoinbaseAddress() {
        return exports.COINBASE_ADDRESS;
    }
    async getStorageAt(address, slot, blockNumberOrPending) {
        const key = slot.toArrayLike(Buffer, "be", 32);
        const data = await this._runInBlockContext(blockNumberOrPending, () => this._stateManager.getContractStorage(address, key));
        const EXPECTED_DATA_SIZE = 32;
        if (data.length < EXPECTED_DATA_SIZE) {
            return Buffer.concat([Buffer.alloc(EXPECTED_DATA_SIZE - data.length, 0), data], EXPECTED_DATA_SIZE);
        }
        return data;
    }
    async getBlockByNumber(blockNumberOrPending) {
        if (blockNumberOrPending === "pending") {
            return this._runInPendingBlockContext(() => this._blockchain.getLatestBlock());
        }
        const block = await this._blockchain.getBlock(blockNumberOrPending);
        return block !== null && block !== void 0 ? block : undefined;
    }
    async getBlockByHash(blockHash) {
        const block = await this._blockchain.getBlock(blockHash);
        return block !== null && block !== void 0 ? block : undefined;
    }
    async getBlockByTransactionHash(hash) {
        const block = await this._blockchain.getBlockByTransactionHash(hash);
        return block !== null && block !== void 0 ? block : undefined;
    }
    async getBlockTotalDifficulty(block) {
        return this._blockchain.getTotalDifficulty(block.hash());
    }
    async getCode(address, blockNumberOrPending) {
        return this._runInBlockContext(blockNumberOrPending, () => this._stateManager.getContractCode(address));
    }
    getNextBlockTimestamp() {
        return this._nextBlockTimestamp.clone();
    }
    setNextBlockTimestamp(timestamp) {
        this._nextBlockTimestamp = new ethereumjs_util_1.BN(timestamp);
    }
    getTimeIncrement() {
        return this._blockTimeOffsetSeconds.clone();
    }
    setTimeIncrement(timeIncrement) {
        this._blockTimeOffsetSeconds = timeIncrement;
    }
    increaseTime(increment) {
        this._blockTimeOffsetSeconds = this._blockTimeOffsetSeconds.add(increment);
    }
    async getPendingTransaction(hash) {
        var _a;
        return (_a = this._txPool.getTransactionByHash(hash)) === null || _a === void 0 ? void 0 : _a.data;
    }
    async getTransactionReceipt(hash) {
        const hashBuffer = hash instanceof Buffer ? hash : ethereumjs_util_1.toBuffer(hash);
        const receipt = await this._blockchain.getTransactionReceipt(hashBuffer);
        return receipt !== null && receipt !== void 0 ? receipt : undefined;
    }
    async getPendingTransactions() {
        const txPoolPending = txMapToArray_1.txMapToArray(this._txPool.getPendingTransactions());
        const txPoolQueued = txMapToArray_1.txMapToArray(this._txPool.getQueuedTransactions());
        return txPoolPending.concat(txPoolQueued);
    }
    async signPersonalMessage(address, data) {
        const messageHash = ethereumjs_util_1.hashPersonalMessage(data);
        const privateKey = this._getLocalAccountPrivateKey(address);
        return ethereumjs_util_1.ecsign(messageHash, privateKey);
    }
    async signTypedDataV4(address, typedData) {
        const privateKey = this._getLocalAccountPrivateKey(address);
        return ethSigUtil.signTypedData_v4(privateKey, {
            data: typedData,
        });
    }
    getStackTraceFailuresCount() {
        return this._failedStackTraces;
    }
    async takeSnapshot() {
        const id = this._nextSnapshotId;
        const snapshot = {
            id,
            date: new Date(),
            latestBlock: await this.getLatestBlock(),
            stateRoot: await this._stateManager.getStateRoot(),
            txPoolSnapshotId: this._txPool.snapshot(),
            blockTimeOffsetSeconds: this.getTimeIncrement(),
            nextBlockTimestamp: this.getNextBlockTimestamp(),
        };
        this._snapshots.push(snapshot);
        this._nextSnapshotId += 1;
        return id;
    }
    async revertToSnapshot(id) {
        const snapshotIndex = this._getSnapshotIndex(id);
        if (snapshotIndex === undefined) {
            return false;
        }
        const snapshot = this._snapshots[snapshotIndex];
        // We compute a new offset such that
        //  now + new_offset === snapshot_date + old_offset
        const now = new Date();
        const offsetToSnapshotInMillis = snapshot.date.valueOf() - now.valueOf();
        const offsetToSnapshotInSecs = Math.ceil(offsetToSnapshotInMillis / 1000);
        const newOffset = snapshot.blockTimeOffsetSeconds.addn(offsetToSnapshotInSecs);
        // We delete all following blocks, changes the state root, and all the
        // relevant Node fields.
        //
        // Note: There's no need to copy the maps here, as snapshots can only be
        // used once
        this._blockchain.deleteLaterBlocks(snapshot.latestBlock);
        await this._stateManager.setStateRoot(snapshot.stateRoot);
        this.setTimeIncrement(newOffset);
        this.setNextBlockTimestamp(snapshot.nextBlockTimestamp);
        this._txPool.revert(snapshot.txPoolSnapshotId);
        // We delete this and the following snapshots, as they can only be used
        // once in Ganache
        this._snapshots.splice(snapshotIndex);
        return true;
    }
    async newFilter(filterParams, isSubscription) {
        filterParams = await this._computeFilterParams(filterParams, true);
        const filterId = this._getNextFilterId();
        this._filters.set(this._filterIdToFiltersKey(filterId), {
            id: filterId,
            type: filter_1.Type.LOGS_SUBSCRIPTION,
            criteria: {
                fromBlock: filterParams.fromBlock,
                toBlock: filterParams.toBlock,
                addresses: filterParams.addresses,
                normalizedTopics: filterParams.normalizedTopics,
            },
            deadline: this._newDeadline(),
            hashes: [],
            logs: await this.getLogs(filterParams),
            subscription: isSubscription,
        });
        return filterId;
    }
    async newBlockFilter(isSubscription) {
        const block = await this.getLatestBlock();
        const filterId = this._getNextFilterId();
        this._filters.set(this._filterIdToFiltersKey(filterId), {
            id: filterId,
            type: filter_1.Type.BLOCK_SUBSCRIPTION,
            deadline: this._newDeadline(),
            hashes: [ethereumjs_util_1.bufferToHex(block.header.hash())],
            logs: [],
            subscription: isSubscription,
        });
        return filterId;
    }
    async newPendingTransactionFilter(isSubscription) {
        const filterId = this._getNextFilterId();
        this._filters.set(this._filterIdToFiltersKey(filterId), {
            id: filterId,
            type: filter_1.Type.PENDING_TRANSACTION_SUBSCRIPTION,
            deadline: this._newDeadline(),
            hashes: [],
            logs: [],
            subscription: isSubscription,
        });
        return filterId;
    }
    async uninstallFilter(filterId, subscription) {
        const key = this._filterIdToFiltersKey(filterId);
        const filter = this._filters.get(key);
        if (filter === undefined) {
            return false;
        }
        if ((filter.subscription && !subscription) ||
            (!filter.subscription && subscription)) {
            return false;
        }
        this._filters.delete(key);
        return true;
    }
    async getFilterChanges(filterId) {
        const key = this._filterIdToFiltersKey(filterId);
        const filter = this._filters.get(key);
        if (filter === undefined) {
            return undefined;
        }
        filter.deadline = this._newDeadline();
        switch (filter.type) {
            case filter_1.Type.BLOCK_SUBSCRIPTION:
            case filter_1.Type.PENDING_TRANSACTION_SUBSCRIPTION:
                const hashes = filter.hashes;
                filter.hashes = [];
                return hashes;
            case filter_1.Type.LOGS_SUBSCRIPTION:
                const logs = filter.logs;
                filter.logs = [];
                return logs;
        }
        return undefined;
    }
    async getFilterLogs(filterId) {
        const key = this._filterIdToFiltersKey(filterId);
        const filter = this._filters.get(key);
        if (filter === undefined) {
            return undefined;
        }
        const logs = filter.logs;
        filter.logs = [];
        filter.deadline = this._newDeadline();
        return logs;
    }
    async getLogs(filterParams) {
        filterParams = await this._computeFilterParams(filterParams, false);
        return this._blockchain.getLogs(filterParams);
    }
    async addCompilationResult(solcVersion, compilerInput, compilerOutput) {
        let bytecodes;
        try {
            bytecodes = compiler_to_model_1.createModelsAndDecodeBytecodes(solcVersion, compilerInput, compilerOutput);
        }
        catch (error) {
            console.warn(chalk_1.default.yellow("The Hardhat Network tracing engine could not be updated. Run Hardhat with --verbose to learn more."));
            log("ContractsIdentifier failed to be updated. Please report this to help us improve Hardhat.\n", error);
            return false;
        }
        for (const bytecode of bytecodes) {
            this._vmTraceDecoder.addBytecode(bytecode);
        }
        return true;
    }
    addImpersonatedAccount(address) {
        this._impersonatedAccounts.add(ethereumjs_util_1.bufferToHex(address));
        return true;
    }
    removeImpersonatedAccount(address) {
        return this._impersonatedAccounts.delete(ethereumjs_util_1.bufferToHex(address));
    }
    setAutomine(automine) {
        this._automine = automine;
    }
    async setBlockGasLimit(gasLimit) {
        this._txPool.setBlockGasLimit(gasLimit);
        await this._txPool.updatePendingAndQueued();
    }
    async _addPendingTransaction(tx) {
        await this._txPool.addTransaction(tx);
        await this._notifyPendingTransaction(tx);
        return ethereumjs_util_1.bufferToHex(tx.hash());
    }
    async _mineTransaction(tx) {
        await this._addPendingTransaction(tx);
        return this.mineBlock();
    }
    async _mineTransactionAndPending(tx) {
        const snapshotId = await this.takeSnapshot();
        let result;
        try {
            const txHash = await this._addPendingTransaction(tx);
            result = await this._mineBlocksUntilTransactionIsIncluded(txHash);
        }
        catch (err) {
            await this.revertToSnapshot(snapshotId);
            throw err;
        }
        this._removeSnapshot(snapshotId);
        return result;
    }
    async _mineBlocksUntilTransactionIsIncluded(txHash) {
        const results = [];
        let txReceipt;
        do {
            if (!this._txPool.hasPendingTransactions()) {
                throw new errors_2.TransactionExecutionError("Failed to mine transaction for unknown reason, this should never happen");
            }
            results.push(await this.mineBlock());
            txReceipt = await this.getTransactionReceipt(txHash);
        } while (txReceipt === undefined);
        while (this._txPool.hasPendingTransactions()) {
            results.push(await this.mineBlock());
        }
        return results;
    }
    async _gatherTraces(result) {
        let vmTrace = this._vmTracer.getLastTopLevelMessageTrace();
        const vmTracerError = this._vmTracer.getLastError();
        this._vmTracer.clearLastError();
        if (vmTrace !== undefined) {
            vmTrace = this._vmTraceDecoder.tryToDecodeMessageTrace(vmTrace);
        }
        const consoleLogMessages = await this._getConsoleLogMessages(vmTrace, vmTracerError);
        const error = await this._manageErrors(result, vmTrace, vmTracerError);
        return {
            trace: vmTrace,
            consoleLogMessages,
            error,
        };
    }
    async _validateExactNonce(tx) {
        let sender;
        try {
            sender = tx.getSenderAddress(); // verifies signature as a side effect
        }
        catch (e) {
            throw new errors_2.InvalidInputError(e.message);
        }
        const senderNonce = await this._txPool.getExecutableNonce(sender);
        const txNonce = new ethereumjs_util_1.BN(tx.nonce);
        const expectedNonceMsg = `Expected nonce to be ${senderNonce} but got ${txNonce}.`;
        if (txNonce.gt(senderNonce)) {
            throw new errors_2.InvalidInputError(`Nonce too high. ${expectedNonceMsg} Note that transactions can't be queued when automining.`);
        }
        if (txNonce.lt(senderNonce)) {
            throw new errors_2.InvalidInputError(`Nonce too low. ${expectedNonceMsg}`);
        }
    }
    /**
     * Mines a new block with as many pending txs as possible, adding it to
     * the VM's blockchain.
     *
     * This method reverts any modification to the state manager if it throws.
     */
    async _mineBlockWithPendingTxs(blockTimestamp) {
        const parentBlock = await this.getLatestBlock();
        const headerData = {
            gasLimit: this.getBlockGasLimit(),
            coinbase: this.getCoinbaseAddress(),
            nonce: "0x0000000000000042",
            timestamp: blockTimestamp,
        };
        const blockBuilder = await this._vm.buildBlock({
            parentBlock,
            headerData,
            blockOpts: { calcDifficultyFromHeader: parentBlock.header },
        });
        try {
            const traces = [];
            const blockGasLimit = this.getBlockGasLimit();
            const minTxFee = this._getMinimalTransactionFee();
            const pendingTxs = this._txPool.getPendingTransactions();
            const txHeap = new TxPriorityHeap_1.TxPriorityHeap(pendingTxs);
            let tx = txHeap.peek();
            const results = [];
            const receipts = [];
            while (blockGasLimit.sub(blockBuilder.gasUsed).gte(minTxFee) &&
                tx !== undefined) {
                if (tx.gasLimit.gt(blockGasLimit.sub(blockBuilder.gasUsed))) {
                    txHeap.pop();
                }
                else {
                    const txResult = await blockBuilder.addTransaction(tx);
                    traces.push(await this._gatherTraces(txResult.execResult));
                    results.push(txResult);
                    receipts.push(txResult.receipt);
                    txHeap.shift();
                }
                tx = txHeap.peek();
            }
            const block = await blockBuilder.build();
            await this._txPool.updatePendingAndQueued();
            return {
                block,
                blockResult: {
                    results,
                    receipts,
                    stateRoot: block.header.stateRoot,
                    logsBloom: block.header.bloom,
                    receiptRoot: block.header.receiptTrie,
                    gasUsed: block.header.gasUsed,
                },
                traces,
            };
        }
        catch (err) {
            await blockBuilder.revert();
            throw err;
        }
    }
    _getMinimalTransactionFee() {
        // Typically 21_000 gas
        return new ethereumjs_util_1.BN(this._vm._common.param("gasPrices", "tx"));
    }
    async _getFakeTransaction(txParams) {
        const sender = new ethereumjs_util_1.Address(txParams.from);
        if (txParams.accessList !== undefined) {
            return new FakeSenderAccessListEIP2930Transaction_1.FakeSenderAccessListEIP2930Transaction(sender, txParams, {
                common: this._vm._common,
            });
        }
        return new FakeSenderTransaction_1.FakeSenderTransaction(sender, txParams, {
            common: this._vm._common,
        });
    }
    _getSnapshotIndex(id) {
        for (const [i, snapshot] of this._snapshots.entries()) {
            if (snapshot.id === id) {
                return i;
            }
            // We already removed the snapshot we are looking for
            if (snapshot.id > id) {
                return undefined;
            }
        }
        return undefined;
    }
    _removeSnapshot(id) {
        const snapshotIndex = this._getSnapshotIndex(id);
        if (snapshotIndex === undefined) {
            return;
        }
        this._snapshots.splice(snapshotIndex);
    }
    _initLocalAccounts(genesisAccounts) {
        const privateKeys = genesisAccounts.map((acc) => ethereumjs_util_1.toBuffer(acc.privateKey));
        for (const pk of privateKeys) {
            this._localAccounts.set(ethereumjs_util_1.bufferToHex(ethereumjs_util_1.privateToAddress(pk)), pk);
        }
    }
    async _getConsoleLogMessages(vmTrace, vmTracerError) {
        if (vmTrace === undefined || vmTracerError !== undefined) {
            log("Could not print console log. Please report this to help us improve Hardhat.\n", vmTracerError);
            return [];
        }
        return this._consoleLogger.getLogMessages(vmTrace);
    }
    async _manageErrors(vmResult, vmTrace, vmTracerError) {
        if (vmResult.exceptionError === undefined) {
            return undefined;
        }
        let stackTrace;
        try {
            if (vmTrace === undefined || vmTracerError !== undefined) {
                throw vmTracerError;
            }
            stackTrace = this._solidityTracer.getStackTrace(vmTrace);
        }
        catch (error) {
            this._failedStackTraces += 1;
            log("Could not generate stack trace. Please report this to help us improve Hardhat.\n", error);
        }
        const error = vmResult.exceptionError;
        // we don't use `instanceof` in case someone uses a different VM dependency
        // see https://github.com/nomiclabs/hardhat/issues/1317
        const isVmError = "error" in error && typeof error.error === "string";
        // If this is not a VM error, or if it's an internal VM error, we just
        // rethrow. An example of a non-VmError being thrown here is an HTTP error
        // coming from the ForkedStateManager.
        if (!isVmError || error.error === exceptions_1.ERROR.INTERNAL_ERROR) {
            throw error;
        }
        if (error.error === exceptions_1.ERROR.OUT_OF_GAS) {
            if (this._isContractTooLargeStackTrace(stackTrace)) {
                return solidity_errors_1.encodeSolidityStackTrace("Transaction ran out of gas", stackTrace);
            }
            return new errors_2.TransactionExecutionError("Transaction ran out of gas");
        }
        if (error.error === exceptions_1.ERROR.REVERT) {
            if (vmResult.returnValue.length === 0) {
                if (stackTrace !== undefined) {
                    return solidity_errors_1.encodeSolidityStackTrace("Transaction reverted without a reason", stackTrace);
                }
                return new errors_2.TransactionExecutionError("Transaction reverted without a reason");
            }
            if (stackTrace !== undefined) {
                return solidity_errors_1.encodeSolidityStackTrace(`VM Exception while processing transaction: revert ${revert_reasons_1.decodeRevertReason(vmResult.returnValue)}`, stackTrace);
            }
            return new errors_2.TransactionExecutionError(`VM Exception while processing transaction: revert ${revert_reasons_1.decodeRevertReason(vmResult.returnValue)}`);
        }
        if (stackTrace !== undefined) {
            return solidity_errors_1.encodeSolidityStackTrace("Transaction failed: revert", stackTrace);
        }
        return new errors_2.TransactionExecutionError("Transaction failed: revert");
    }
    _isContractTooLargeStackTrace(stackTrace) {
        return (stackTrace !== undefined &&
            stackTrace.length > 0 &&
            stackTrace[stackTrace.length - 1].type ===
                solidity_stack_trace_1.StackTraceEntryType.CONTRACT_TOO_LARGE_ERROR);
    }
    _calculateTimestampAndOffset(timestamp) {
        let blockTimestamp;
        let offsetShouldChange;
        let newOffset = new ethereumjs_util_1.BN(0);
        const currentTimestamp = new ethereumjs_util_1.BN(getCurrentTimestamp_1.getCurrentTimestamp());
        // if timestamp is not provided, we check nextBlockTimestamp, if it is
        // set, we use it as the timestamp instead. If it is not set, we use
        // time offset + real time as the timestamp.
        if (timestamp === undefined || timestamp.eqn(0)) {
            if (this.getNextBlockTimestamp().eqn(0)) {
                blockTimestamp = currentTimestamp.add(this.getTimeIncrement());
                offsetShouldChange = false;
            }
            else {
                blockTimestamp = this.getNextBlockTimestamp();
                offsetShouldChange = true;
            }
        }
        else {
            offsetShouldChange = true;
            blockTimestamp = timestamp;
        }
        if (offsetShouldChange) {
            newOffset = blockTimestamp.sub(currentTimestamp);
        }
        return [blockTimestamp, offsetShouldChange, newOffset];
    }
    async _resetNextBlockTimestamp() {
        this.setNextBlockTimestamp(new ethereumjs_util_1.BN(0));
    }
    async _notifyPendingTransaction(tx) {
        this._filters.forEach((filter) => {
            if (filter.type === filter_1.Type.PENDING_TRANSACTION_SUBSCRIPTION) {
                const hash = ethereumjs_util_1.bufferToHex(tx.hash());
                if (filter.subscription) {
                    this._emitEthEvent(filter.id, hash);
                    return;
                }
                filter.hashes.push(hash);
            }
        });
    }
    _getLocalAccountPrivateKey(sender) {
        const senderAddress = sender.toString();
        if (!this._localAccounts.has(senderAddress)) {
            throw new errors_2.InvalidInputError(`unknown account ${senderAddress}`);
        }
        return this._localAccounts.get(senderAddress);
    }
    /**
     * Saves a block as successfully run. This method requires that the block
     * was added to the blockchain.
     */
    async _saveBlockAsSuccessfullyRun(block, runBlockResult) {
        const receipts = output_1.getRpcReceiptOutputsFromLocalBlockExecution(block, runBlockResult, output_1.shouldShowTransactionTypeForHardfork(this._vm._common));
        this._blockchain.addTransactionReceipts(receipts);
        const td = await this.getBlockTotalDifficulty(block);
        const rpcLogs = [];
        for (const receipt of receipts) {
            rpcLogs.push(...receipt.logs);
        }
        this._filters.forEach((filter, key) => {
            if (filter.deadline.valueOf() < new Date().valueOf()) {
                this._filters.delete(key);
            }
            switch (filter.type) {
                case filter_1.Type.BLOCK_SUBSCRIPTION:
                    const hash = block.hash();
                    if (filter.subscription) {
                        this._emitEthEvent(filter.id, output_1.getRpcBlock(block, td, output_1.shouldShowTransactionTypeForHardfork(this._vm._common), false));
                        return;
                    }
                    filter.hashes.push(ethereumjs_util_1.bufferToHex(hash));
                    break;
                case filter_1.Type.LOGS_SUBSCRIPTION:
                    if (filter_1.bloomFilter(new bloom_1.default(block.header.bloom), filter.criteria.addresses, filter.criteria.normalizedTopics)) {
                        const logs = filter_1.filterLogs(rpcLogs, filter.criteria);
                        if (logs.length === 0) {
                            return;
                        }
                        if (filter.subscription) {
                            logs.forEach((rpcLog) => {
                                this._emitEthEvent(filter.id, rpcLog);
                            });
                            return;
                        }
                        filter.logs.push(...logs);
                    }
                    break;
            }
        });
    }
    async _timestampClashesWithPreviousBlockOne(blockTimestamp) {
        const latestBlock = await this.getLatestBlock();
        const latestBlockTimestamp = new ethereumjs_util_1.BN(latestBlock.header.timestamp);
        return latestBlockTimestamp.eq(blockTimestamp);
    }
    async _runInBlockContext(blockNumberOrPending, action) {
        if (blockNumberOrPending === "pending") {
            return this._runInPendingBlockContext(action);
        }
        if (blockNumberOrPending.eq(await this.getLatestBlockNumber())) {
            return action();
        }
        const block = await this.getBlockByNumber(blockNumberOrPending);
        if (block === undefined) {
            // TODO handle this better
            throw new Error(`Block with number ${blockNumberOrPending} doesn't exist. This should never happen.`);
        }
        const currentStateRoot = await this._stateManager.getStateRoot();
        await this._setBlockContext(block);
        try {
            return await action();
        }
        finally {
            await this._restoreBlockContext(currentStateRoot);
        }
    }
    async _runInPendingBlockContext(action) {
        const snapshotId = await this.takeSnapshot();
        try {
            await this.mineBlock();
            return await action();
        }
        finally {
            await this.revertToSnapshot(snapshotId);
        }
    }
    async _setBlockContext(block) {
        if (this._stateManager instanceof ForkStateManager_1.ForkStateManager) {
            return this._stateManager.setBlockContext(block.header.stateRoot, block.header.number);
        }
        return this._stateManager.setStateRoot(block.header.stateRoot);
    }
    async _restoreBlockContext(stateRoot) {
        if (this._stateManager instanceof ForkStateManager_1.ForkStateManager) {
            return this._stateManager.restoreForkBlockContext(stateRoot);
        }
        return this._stateManager.setStateRoot(stateRoot);
    }
    async _correctInitialEstimation(blockNumberOrPending, txParams, initialEstimation) {
        let tx = await this._getFakeTransaction(Object.assign(Object.assign({}, txParams), { gasLimit: initialEstimation }));
        if (tx.getBaseFee().gte(initialEstimation)) {
            initialEstimation = tx.getBaseFee().addn(1);
            tx = await this._getFakeTransaction(Object.assign(Object.assign({}, txParams), { gasLimit: initialEstimation }));
        }
        const result = await this._runInBlockContext(blockNumberOrPending, () => this._runTxAndRevertMutations(tx, blockNumberOrPending));
        if (result.execResult.exceptionError === undefined) {
            return initialEstimation;
        }
        return this._binarySearchEstimation(blockNumberOrPending, txParams, initialEstimation, this.getBlockGasLimit());
    }
    async _binarySearchEstimation(blockNumberOrPending, txParams, highestFailingEstimation, lowestSuccessfulEstimation, roundNumber = 0) {
        if (lowestSuccessfulEstimation.lte(highestFailingEstimation)) {
            // This shouldn't happen, but we don't want to go into an infinite loop
            // if it ever happens
            return lowestSuccessfulEstimation;
        }
        const MAX_GAS_ESTIMATION_IMPROVEMENT_ROUNDS = 20;
        const diff = lowestSuccessfulEstimation.sub(highestFailingEstimation);
        const minDiff = highestFailingEstimation.gten(4000000)
            ? 50000
            : highestFailingEstimation.gten(1000000)
                ? 10000
                : highestFailingEstimation.gten(100000)
                    ? 1000
                    : highestFailingEstimation.gten(50000)
                        ? 500
                        : highestFailingEstimation.gten(30000)
                            ? 300
                            : 200;
        if (diff.lten(minDiff)) {
            return lowestSuccessfulEstimation;
        }
        if (roundNumber > MAX_GAS_ESTIMATION_IMPROVEMENT_ROUNDS) {
            return lowestSuccessfulEstimation;
        }
        const binSearchNewEstimation = highestFailingEstimation.add(diff.divn(2));
        const optimizedEstimation = roundNumber === 0
            ? highestFailingEstimation.muln(3)
            : binSearchNewEstimation;
        const newEstimation = optimizedEstimation.gt(binSearchNewEstimation)
            ? binSearchNewEstimation
            : optimizedEstimation;
        // Let other things execute
        await new Promise((resolve) => setImmediate(resolve));
        const tx = await this._getFakeTransaction(Object.assign(Object.assign({}, txParams), { gasLimit: newEstimation }));
        const result = await this._runInBlockContext(blockNumberOrPending, () => this._runTxAndRevertMutations(tx, blockNumberOrPending));
        if (result.execResult.exceptionError === undefined) {
            return this._binarySearchEstimation(blockNumberOrPending, txParams, highestFailingEstimation, newEstimation, roundNumber + 1);
        }
        return this._binarySearchEstimation(blockNumberOrPending, txParams, newEstimation, lowestSuccessfulEstimation, roundNumber + 1);
    }
    /**
     * This function runs a transaction and reverts all the modifications that it
     * makes.
     */
    async _runTxAndRevertMutations(tx, blockNumberOrPending) {
        const initialStateRoot = await this._stateManager.getStateRoot();
        let blockContext;
        try {
            if (blockNumberOrPending === "pending") {
                // the new block has already been mined by _runInBlockContext hence we take latest here
                blockContext = await this.getLatestBlock();
            }
            else {
                // We know that this block number exists, because otherwise
                // there would be an error in the RPC layer.
                const block = await this.getBlockByNumber(blockNumberOrPending);
                errors_1.assertHardhatInvariant(block !== undefined, "Tried to run a tx in the context of a non-existent block");
                blockContext = block;
                // we don't need to add the tx to the block because runTx doesn't
                // know anything about the txs in the current block
            }
            return await this._vm.runTx({
                block: blockContext,
                tx,
                skipNonce: true,
                skipBalance: true,
                skipBlockGasLimitValidation: true,
            });
        }
        finally {
            await this._stateManager.setStateRoot(initialStateRoot);
        }
    }
    async _computeFilterParams(filterParams, isFilter) {
        const latestBlockNumber = await this.getLatestBlockNumber();
        const newFilterParams = Object.assign({}, filterParams);
        if (newFilterParams.fromBlock === filter_1.LATEST_BLOCK) {
            newFilterParams.fromBlock = latestBlockNumber;
        }
        if (!isFilter && newFilterParams.toBlock === filter_1.LATEST_BLOCK) {
            newFilterParams.toBlock = latestBlockNumber;
        }
        if (newFilterParams.toBlock.gt(latestBlockNumber)) {
            newFilterParams.toBlock = latestBlockNumber;
        }
        if (newFilterParams.fromBlock.gt(latestBlockNumber)) {
            newFilterParams.fromBlock = latestBlockNumber;
        }
        return newFilterParams;
    }
    _newDeadline() {
        const dt = new Date();
        dt.setMinutes(dt.getMinutes() + 5); // This will not overflow
        return dt;
    }
    _getNextFilterId() {
        this._lastFilterId = this._lastFilterId.addn(1);
        return this._lastFilterId;
    }
    _filterIdToFiltersKey(filterId) {
        return filterId.toString();
    }
    _emitEthEvent(filterId, result) {
        this.emit("ethEvent", {
            result,
            filterId,
        });
    }
    async _getNonce(address, blockNumberOrPending) {
        if (blockNumberOrPending === "pending") {
            return this.getAccountExecutableNonce(address);
        }
        return this._runInBlockContext(blockNumberOrPending, async () => {
            const account = await this._stateManager.getAccount(address);
            return account.nonce;
        });
    }
}
exports.HardhatNode = HardhatNode;
//# sourceMappingURL=node.js.map